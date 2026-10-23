import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBox, Icon, Modal } from "../ui";
import { friendly } from "../api";
import { currency, entryPayload } from "./domain";
import { csvTemplate, prepareImport } from "./csv-import";
export default function ImportDialog({
  accounts,
  entries,
  busy,
  canPersist,
  onImport,
  onClose,
}) {
  const [account, setAccount] = useState(accounts[0]?.id || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [reading, setReading] = useState(false);
  const [includeSimilar, setIncludeSimilar] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const lock = useRef(false);
  const dataVersion = useMemo(
    () =>
      entries
        .map((e) => `${e.id}:${e.version}`)
        .sort()
        .join("|"),
    [entries],
  );
  useEffect(() => {
    if (preview && preview.dataVersion !== dataVersion) {
      setPreview(null);
      setError(
        "Os lançamentos foram atualizados durante a conferência. Analise o arquivo novamente antes de importar.",
      );
    }
  }, [dataVersion, preview]);
  const selected =
    preview?.rows.filter(
      (r) => !r.alreadyImported && (!r.similar || includeSimilar),
    ) || [];
  const similarCount = preview?.rows.filter((r) => r.similar).length || 0;
  const importedCount =
    preview?.rows.filter((r) => r.alreadyImported).length || 0;
  const disabled = busy || reading;
  function reset() {
    revision.current++;
    setPreview(null);
    setError("");
    setIncludeSimilar(false);
  }
  async function analyze(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    const current = ++revision.current;
    setReading(true);
    setError("");
    setPreview(null);
    setIncludeSimilar(false);
    try {
      if (!file || file.size > 1048576)
        throw new Error("Selecione um arquivo CSV UTF-8 de até 1 MB.");
      let source;
      try {
        source = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
      } catch {
        throw new Error(
          "O arquivo não está em UTF-8. Exporte novamente como CSV UTF-8.",
        );
      }
      const result = await prepareImport(source, account, accounts, entries);
      if (current === revision.current) setPreview({ ...result, dataVersion });
    } catch (e) {
      if (current === revision.current) setError(friendly(e));
    } finally {
      lock.current = false;
      setReading(false);
    }
  }
  async function confirm() {
    if (lock.current || !selected.length || preview.errors.length) return;
    lock.current = true;
    setError("");
    try {
      await onImport(selected.map((r) => ({ ...entryPayload(r), id: r.id })));
      onClose();
    } catch (e) {
      setError(friendly(e));
    } finally {
      lock.current = false;
    }
  }
  function template() {
    const url = URL.createObjectURL(
      new Blob([csvTemplate()], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-financeiro-sr-service.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Modal
      title="Importar lançamentos em CSV"
      onClose={() => {
        if (!disabled && !lock.current) onClose();
      }}
    >
      <div className="finance-import">
        <p>
          Escolha uma conta, confira a prévia e confirme. Nenhum registro
          existente será alterado. Até 100 lançamentos por arquivo, gravados em
          conjunto.
        </p>
        <button className="text-link" onClick={template}>
          <Icon name="Download" size={16} /> Baixar modelo CSV
        </button>
        <form onSubmit={analyze}>
          <label className="field">
            Conta para os lançamentos
            <select
              aria-label="Conta para os lançamentos"
              value={account}
              disabled={disabled}
              onChange={(e) => {
                reset();
                setAccount(e.target.value);
              }}
            >
              {accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Arquivo CSV
            <input
              aria-label="Arquivo CSV"
              type="file"
              accept=".csv,text/csv"
              disabled={disabled}
              onChange={(e) => {
                reset();
                setFile(e.target.files[0] || null);
              }}
            />
          </label>
          <details className="import-format">
            <summary>Formato do arquivo e limites</summary>
            <p className="form-hint">
              Colunas: Data, Descrição, Tipo e Valor (R$). Categoria e Situação
              são opcionais; sem situação, o lançamento será previsto. Datas
              AAAA-MM-DD ou DD/MM/AAAA. Valores com até duas casas decimais.
              Transfira entre contas e confirme recorrências pelas funções
              próprias do portal.
            </p>
          </details>
          <button className="button secondary" disabled={disabled || !file}>
            {reading ? "Analisando arquivo…" : "Analisar arquivo"}
            <Icon name="Search" size={16} />
          </button>
        </form>
        <ErrorBox>
          {!canPersist
            ? "Sem conexão. Reconecte-se para confirmar a importação no Firestore."
            : error}
        </ErrorBox>
        {preview && (
          <section className="import-preview" aria-label="Prévia da importação">
            <h3>Confira antes de importar</h3>
            <div className="import-counts" role="status">
              <span>{preview.total} no arquivo</span>
              <strong>{selected.length} para importar</strong>
              <span>{importedCount} já importado(s)</span>
            </div>
            {similarCount > 0 && (
              <div className="message neutral">
                <p>
                  {similarCount} registro(s) semelhante(s) a lançamentos
                  existentes. Confira se representam movimentações diferentes.
                </p>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={includeSimilar}
                    disabled={disabled}
                    onChange={(e) => setIncludeSimilar(e.target.checked)}
                  />{" "}
                  Incluir lançamentos semelhantes
                </label>
              </div>
            )}
            {preview.errors.length > 0 && (
              <div className="message error" role="alert">
                <strong>
                  Corrija {preview.errors.length} registro(s) antes de importar.
                  Nenhum foi gravado.
                </strong>
                <ul>
                  {preview.errors.slice(0, 10).map((e) => (
                    <li key={e.record}>
                      Registro {e.record}: {e.message}
                    </li>
                  ))}
                </ul>
                {preview.errors.length > 10 && (
                  <p>Os demais erros aparecerão após corrigir os primeiros.</p>
                )}
              </div>
            )}
            <div className="import-records">
              {preview.rows.map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{r.description}</strong>
                    <small>
                      {r.date} · {r.category} ·{" "}
                      {r.status === "paid"
                        ? "Realizado"
                        : r.status === "void"
                          ? "Cancelado"
                          : "Previsto"}
                    </small>
                  </div>
                  <span>
                    {r.kind === "expense" ? "− " : "+ "}
                    {currency(r.amount_cents)}
                    <small>
                      {r.alreadyImported
                        ? "Já importado"
                        : r.similar && !includeSimilar
                          ? "Semelhante · ignorado"
                          : "Novo"}
                    </small>
                  </span>
                </article>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="form-hint">
                Ao confirmar, os registros marcados como realizados passam a
                compor o saldo da conta selecionada. Previsto e cancelado não
                alteram o saldo realizado.
              </p>
            )}
          </section>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={disabled}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button"
            disabled={
              disabled ||
              !canPersist ||
              !preview ||
              preview.errors.length > 0 ||
              !selected.length
            }
            onClick={confirm}
          >
            {busy
              ? "Importando…"
              : `Confirmar importação${selected.length ? ` (${selected.length})` : ""}`}
            <Icon name="Check" size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
