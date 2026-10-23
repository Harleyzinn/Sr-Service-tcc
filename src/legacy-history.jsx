import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore/lite";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { friendly } from "./api";
import { Badge, ErrorBox, Loading, PageHeading } from "./ui";

const statuses = [
  "Não Visualizado",
  "Pendente",
  "Em Análise",
  "Aprovado",
  "Concluído",
  "Recusado",
  "Cancelado",
];
export default function LegacyHistory() {
  const { user, admin, demo } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const request = demo
      ? Promise.resolve([])
      : getDocs(
          query(
            collection(db, "orcamentos"),
            ...(admin ? [] : [where("userUid", "==", user.id)]),
          ),
        ).then((snapshot) =>
          snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
        );
    request
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((e) => {
        if (active) setError(friendly(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id, admin, demo, revision]);
  async function update(event, record) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const status = new FormData(event.currentTarget).get("status");
    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "orcamentos", record.id);
        const current = await transaction.get(ref);
        if (
          !current.exists() ||
          current.data().STATUS_ORCAMENTO !== record.STATUS_ORCAMENTO
        )
          throw new Error("O orçamento mudou. Recarregue antes de salvar.");
        transaction.update(ref, {
          STATUS_ORCAMENTO: status,
          updatedAt: serverTimestamp(),
        });
      });
      setRevision((value) => value + 1);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Histórico anterior"
        description="Orçamentos da versão anterior. As informações originais são preservadas."
      >
        <button
          className="button secondary"
          disabled={loading || busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Recarregar
        </button>
      </PageHeading>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : !error && records.length === 0 ? (
        <section className="panel detail-panel">
          <h2>Nenhum orçamento anterior</h2>
          <p>
            {demo
              ? "A demonstração não consulta registros reais."
              : "Os orçamentos da versão anterior vinculados à sua conta aparecerão aqui."}
          </p>
        </section>
      ) : (
        records.map((record) => (
          <section className="panel detail-panel" key={record.id}>
            <div className="panel-heading">
              <h2>Orçamento {record.COD_ORCAMENTO}</h2>
              <Badge status={record.STATUS_ORCAMENTO || "Não informado"} />
            </div>
            <dl className="detail-fields">
              {[
                ["Empresa", record.NOME_EMPRESA],
                ["Contato", record.NOME_CONTATO],
                ["E-mail", record.EMAIL_CONTATO],
                ["Telefone", record.TELEFONE_CONTATO],
                ["Serviço", record.TIPO_SERVICO],
                ["Descrição", record.DESCRICAO],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="preserve-lines">{value || "Não informado"}</dd>
                </div>
              ))}
            </dl>
            {admin && (
              <form onSubmit={(event) => update(event, record)}>
                <label className="field">
                  <span>Status do orçamento anterior</span>
                  <select
                    name="status"
                    defaultValue={record.STATUS_ORCAMENTO}
                    key={record.STATUS_ORCAMENTO}
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <button className="button" disabled={busy}>
                  {busy ? "Salvando…" : "Atualizar status"}
                </button>
              </form>
            )}
          </section>
        ))
      )}
    </>
  );
}
