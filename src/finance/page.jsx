import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFinance } from "./use-finance";
import {
  addDays,
  addMonths,
  balances,
  categories,
  cents,
  currency,
  entryPayload,
  forecast,
  inputMoney,
  insights,
  installments,
  monthRange,
  occurrences,
  today,
  totals,
} from "./domain";
import { csvCell, date, searchText } from "../domain";
import { friendly } from "../api";
import {
  ErrorBox,
  Field,
  Icon,
  Loading,
  Modal,
  PageHeading,
  SelectField,
  useToast,
} from "../ui";
import { usePreferences } from "../theme";
import { useOnline } from "../network";
import "./styles.css";
const displayDate = (value) => date(value + "T12:00:00Z");
const labels = {
  income: "Entrada",
  expense: "Gasto",
  transfer: "Transferência",
  paid: "Realizado",
  pending: "Previsto",
  void: "Cancelado",
};
const tabs = [
  ["visao", "LayoutDashboard", "Visão financeira"],
  ["lancamentos", "Files", "Lançamentos"],
  ["agenda", "CalendarDays", "Agenda"],
  ["recorrencias", "RefreshCw", "Recorrências"],
  ["planejamento", "Target", "Planejamento"],
  ["contas", "Wallet", "Contas"],
];
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function FinanceForm({ model, accounts, month, onSave, busy, onClose }) {
  const kind = model.type;
  const existing = model.value || {};
  const [error, setError] = useState("");
  const [entryKind, setEntryKind] = useState(
    existing.kind || model.kind || "expense",
  );
  async function submit(e) {
    e.preventDefault();
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      let payload;
      if (kind === "accounts")
        payload = {
          name: form.name.trim(),
          type: form.type,
          opening_cents: cents(form.opening),
        };
      if (kind === "entries")
        payload = {
          kind: entryKind,
          description: form.description.trim(),
          category: form.category,
          account_id: form.account_id,
          to_account_id: entryKind === "transfer" ? form.to_account_id : "",
          amount_cents: cents(form.amount),
          date: form.date,
          status: form.status,
          series_id: "",
        };
      if (kind === "series")
        payload = {
          kind: entryKind,
          description: form.description.trim(),
          category: form.category,
          account_id: form.account_id,
          amount_cents: cents(form.amount),
          start_date: form.start_date,
          end_date: form.end_date || "",
          frequency: form.frequency,
          active: existing.active ?? true,
        };
      if (kind === "budgets")
        payload = {
          month: form.month,
          category: form.category,
          limit_cents: cents(form.limit),
        };
      if (kind === "goals")
        payload = {
          name: form.name.trim(),
          target_cents: cents(form.target),
          saved_cents: cents(form.saved),
        };
      await onSave(payload, Number(form.installments || 1));
    } catch (e) {
      setError(friendly(e));
    }
  }
  return (
    <form className="finance-form" onSubmit={submit}>
      <ErrorBox>{error}</ErrorBox>
      {kind === "accounts" && (
        <>
          <Field
            label="Nome da conta"
            name="name"
            autoFocus
            required
            maxLength={80}
            placeholder="Ex.: Conta principal"
            defaultValue={existing.name}
          />
          <SelectField
            label="Tipo de conta"
            name="type"
            defaultValue={existing.type || "checking"}
          >
            <option value="checking">Conta corrente</option>
            <option value="cash">Dinheiro em caixa</option>
            <option value="card">Cartão (saldo manual)</option>
          </SelectField>
          <Field
            label="Saldo anterior aos lançamentos (R$)"
            name="opening"
            inputMode="decimal"
            defaultValue={inputMoney(existing.opening_cents || 0)}
            required
          />
          <p className="form-hint">
            Informe o saldo antes dos lançamentos que vai registrar. Cartões não
            têm integração bancária ou fechamento de fatura automático.
          </p>
        </>
      )}
      {(kind === "entries" || kind === "series") && (
        <>
          <div className="kind-switch">
            {(kind === "series"
              ? ["income", "expense"]
              : ["income", "expense", "transfer"]
            ).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={entryKind === value}
                className={entryKind === value ? "selected" : ""}
                onClick={() => setEntryKind(value)}
              >
                {labels[value]}
              </button>
            ))}
          </div>
          <Field
            label="Descrição"
            name="description"
            autoFocus
            required
            minLength={3}
            maxLength={150}
            defaultValue={existing.description}
            placeholder={
              entryKind === "income"
                ? "Ex.: Recebimento de serviço"
                : "Ex.: Compra de ferramentas"
            }
          />
          <div className="form-row">
            <Field
              label="Valor (R$)"
              name="amount"
              inputMode="decimal"
              required
              defaultValue={
                existing.amount_cents ? inputMoney(existing.amount_cents) : ""
              }
              placeholder="0,00"
            />
            {kind === "entries" ? (
              <Field
                label="Data"
                name="date"
                type="date"
                required
                defaultValue={existing.date || today()}
              />
            ) : (
              <SelectField
                label="Frequência"
                name="frequency"
                defaultValue={existing.frequency || "monthly"}
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </SelectField>
            )}
          </div>
          <SelectField
            label={entryKind === "transfer" ? "Conta de origem" : "Conta"}
            name="account_id"
            defaultValue={existing.account_id || accounts[0]?.id}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>
          {entryKind === "transfer" && (
            <SelectField
              label="Conta de destino"
              name="to_account_id"
              required
              defaultValue={existing.to_account_id || ""}
            >
              <option value="">Selecione outra conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectField>
          )}
          <details className="advanced-options" open={kind === "series"}>
            <summary>
              {kind === "series"
                ? "Regras da recorrência"
                : "Mais opções: categoria, previsão e parcelas"}
            </summary>
            <SelectField
              label="Categoria"
              name="category"
              defaultValue={existing.category || "Outros"}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
            {kind === "entries" ? (
              <>
                <SelectField
                  label="Situação"
                  name="status"
                  defaultValue={existing.status || "paid"}
                >
                  <option value="paid">Realizado (já ocorreu)</option>
                  <option value="pending">Previsto (a confirmar)</option>
                </SelectField>
                {entryKind === "expense" && (
                  <Field
                    label="Número de parcelas"
                    name="installments"
                    type="number"
                    min={1}
                    max={36}
                    defaultValue={1}
                  />
                )}
                <p className="form-hint">
                  O valor informado será dividido exatamente entre as parcelas.
                  Somente a primeira pode ser realizada agora; as demais ficam
                  previstas. Transferências não alteram o saldo consolidado.
                </p>
              </>
            ) : (
              <>
                <div className="form-row">
                  <Field
                    label="Primeira ocorrência"
                    name="start_date"
                    type="date"
                    required
                    defaultValue={existing.start_date || today()}
                  />
                  <Field
                    label="Encerrar em (opcional)"
                    name="end_date"
                    type="date"
                    defaultValue={existing.end_date || ""}
                  />
                </div>
                <p className="form-hint">
                  As previsões são calculadas a partir desta regra. Nenhuma
                  cobrança é realizada. Alterar ou pausar a série muda somente
                  as ocorrências ainda não registradas; pagamentos anteriores
                  são preservados.
                </p>
              </>
            )}
          </details>
        </>
      )}
      {kind === "budgets" && (
        <>
          <Field
            label="Mês do limite"
            name="month"
            type="month"
            required
            defaultValue={existing.month || month}
          />
          <SelectField
            label="Categoria"
            name="category"
            defaultValue={existing.category || "Outros"}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <Field
            label="Limite mensal (R$)"
            name="limit"
            inputMode="decimal"
            required
            defaultValue={
              existing.limit_cents ? inputMoney(existing.limit_cents) : ""
            }
          />
        </>
      )}
      {kind === "goals" && (
        <>
          <Field
            label="Nome da meta"
            name="name"
            required
            maxLength={80}
            defaultValue={existing.name}
            placeholder="Ex.: Reserva para equipamentos"
          />
          <div className="form-row">
            <Field
              label="Objetivo (R$)"
              name="target"
              inputMode="decimal"
              required
              defaultValue={
                existing.target_cents ? inputMoney(existing.target_cents) : ""
              }
            />
            <Field
              label="Já reservado (R$)"
              name="saved"
              inputMode="decimal"
              required
              defaultValue={inputMoney(existing.saved_cents || 0)}
            />
          </div>
          <p className="form-hint">
            A meta é um acompanhamento manual. O valor reservado não é retirado
            das contas nem somado ao patrimônio.
          </p>
        </>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button className="button" disabled={busy}>
          {busy
            ? "Salvando…"
            : existing.version
              ? "Salvar alterações"
              : "Salvar registro"}
          <Icon
            name={busy ? "LoaderCircle" : "Check"}
            size={16}
            className={busy ? "spin" : ""}
          />
        </button>
      </div>
    </form>
  );
}
export default function Finance() {
  const { data, loading, error, busy, refresh, mutate, demo } = useFinance();
  const { preferences } = usePreferences();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const validTabs = tabs.map((t) => t[0]);
  const tab = validTabs.includes(params.get("aba"))
    ? params.get("aba")
    : "visao";
  const requested = params.get("mes");
  const month = /^20\d{2}-(0[1-9]|1[0-2])$/.test(requested || "")
    ? requested
    : today().slice(0, 7);
  const [from, to] = monthRange(month);
  const [model, setModel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [operationError, setOperationError] = useState("");
  const now = today();
  const horizon = addDays(now, 30);
  const forecastVirtual = useMemo(
    () =>
      occurrences(data.series, data.entries, now.slice(0, 7) + "-01", horizon),
    [data.series, data.entries, now, horizon],
  );
  const monthVirtual = useMemo(
    () => occurrences(data.series, data.entries, from, to),
    [data.series, data.entries, from, to],
  );
  const selected = [...data.entries, ...monthVirtual].filter(
    (e) => e.date >= from && e.date <= to,
  );
  const all = [...data.entries, ...forecastVirtual];
  const actual = totals(data.entries, from, to);
  const previousMonth = addMonths(from, -1).slice(0, 7);
  const previousRange = monthRange(previousMonth);
  const previous = totals(data.entries, ...previousRange);
  const accountBalances = balances(data.accounts, data.entries);
  const consolidated = Object.values(accountBalances).reduce(
    (a, b) => a + b,
    0,
  );
  const projected = forecast(
    consolidated,
    all,
    all
      .filter((e) => e.status === "pending")
      .map((e) => e.date)
      .sort()[0] || now,
    horizon,
  );
  const alerts = insights(all, data.budgets, month, now);
  const chart = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      addMonths(from, i - 5).slice(0, 7),
    );
    const buckets = Object.fromEntries(
      months.map((m) => [m, { income: 0, expense: 0 }]),
    );
    for (const e of data.entries) {
      const bucket = buckets[e.date.slice(0, 7)];
      if (
        bucket &&
        e.status === "paid" &&
        (e.kind === "income" || e.kind === "expense")
      )
        bucket[e.kind] += e.amount_cents;
    }
    return {
      months,
      buckets,
      max: Math.max(
        1,
        ...Object.values(buckets).flatMap((b) => [b.income, b.expense]),
      ),
    };
  }, [data.entries, from]);
  const filtered = selected
    .filter(
      (e) =>
        (!status || e.status === status) &&
        (!category || e.category === category) &&
        searchText(`${e.description} ${e.category}`).includes(
          searchText(search),
        ),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  function navigate(next) {
    setParams({ ...Object.fromEntries(params), ...next }, { replace: true });
    setPage(1);
  }
  function open(type, kind, value) {
    setOperationError("");
    setModel({ type, kind, value, id: value?.id || crypto.randomUUID() });
  }
  async function save(payload, count) {
    const current = model;
    await mutate(async (repo) => {
      if (current.type === "entries") {
        await repo.createEntries(
          installments(payload, count, current.id),
          data.accounts,
        );
      } else {
        const id =
          current.type === "budgets"
            ? `${payload.month}_${payload.category}`
            : current.id;
        await repo.save(
          current.type,
          id,
          payload,
          current.value?.version || 0,
          data.accounts,
        );
      }
    });
    setModel(null);
    toast("Registro salvo e saldo recalculado com os dados persistidos.");
  }
  async function changeEntry(entry, next) {
    try {
      setOperationError("");
      await mutate((repo) =>
        entry.virtual
          ? repo.createEntries(
              [{ ...entryPayload(entry), id: entry.id, status: next }],
              data.accounts,
            )
          : repo.save(
              "entries",
              entry.id,
              { ...entryPayload(entry), status: next },
              entry.version,
              data.accounts,
            ),
      );
      setConfirm(null);
      toast(
        next === "void"
          ? "Lançamento cancelado. O histórico foi preservado."
          : "Situação atualizada.",
      );
    } catch (e) {
      setOperationError(friendly(e));
    }
  }
  async function toggleSeries(s) {
    try {
      setOperationError("");
      await mutate((repo) =>
        repo.save(
          "series",
          s.id,
          { ...s, active: !s.active },
          s.version,
          data.accounts,
        ),
      );
      toast(s.active ? "Recorrência pausada." : "Recorrência retomada.");
    } catch (e) {
      setOperationError(friendly(e));
    }
  }
  function csv() {
    download(
      `sr-service-caixa-${month}.csv`,
      "\uFEFF" +
        [
          ["Data", "Descrição", "Categoria", "Tipo", "Situação", "Valor (R$)"],
          ...filtered.map((e) => [
            e.date,
            e.description,
            e.category,
            labels[e.kind],
            e.virtual ? "Previsão de recorrência" : labels[e.status],
            inputMoney(e.amount_cents).replace(".", ","),
          ]),
        ]
          .map((row) => row.map(csvCell).join(";"))
          .join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  const online = useOnline();
  const canWrite =
    data.accounts.length > 0 && !busy && !loading && !error && (demo || online);
  return (
    <>
      <PageHeading
        eyebrow="CONTROLE PRIVADO · DADOS DA SUA CONTA"
        title="Financeiro"
        description="Registre o que aconteceu. Planeje o que vem a seguir."
      >
        <button
          className="button secondary"
          disabled={busy || loading}
          onClick={refresh}
        >
          <Icon name="RefreshCw" size={16} />
          Atualizar
        </button>
        <button
          className="button secondary"
          disabled={!canWrite}
          onClick={() => open("entries", "expense")}
        >
          <Icon name="Minus" size={16} />
          Gasto
        </button>
        <button
          className="button"
          disabled={!canWrite}
          onClick={() => open("entries", "income")}
        >
          <Icon name="Plus" size={16} />
          Entrada
        </button>
      </PageHeading>
      <div className="finance-privacy">
        <Icon name="LockKeyhole" size={15} />
        <span>
          Seu caixa é privado. Valores de propostas não são receitas recebidas.{" "}
          {demo
            ? "Demonstração: seus registros ficam somente neste navegador."
            : "Gravações confirmadas são persistidas no Firestore."}
        </span>
      </div>
      <nav className="finance-tabs" aria-label="Módulos financeiros">
        {tabs.map(([id, icon, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => navigate({ aba: id })}
          >
            <Icon name={icon} size={17} />
            {label}
          </button>
        ))}
      </nav>
      <div className="finance-period">
        <div>
          <strong>
            {tab === "visao"
              ? "Seu dinheiro, com clareza"
              : tabs.find((t) => t[0] === tab)[2]}
          </strong>
          <p>Realizado e previsto aparecem separados.</p>
        </div>
        <label>
          Período
          <input
            type="month"
            aria-label="Período financeiro"
            value={month}
            min="2000-01"
            max="2099-12"
            onChange={(e) => {
              if (e.target.value) navigate({ mes: e.target.value });
            }}
          />
        </label>
      </div>
      <ErrorBox>{operationError || error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="panel empty">
          <h2>Não foi possível consultar o caixa</h2>
          <p>
            Não calculamos saldos parciais. Verifique sua conexão e tente
            atualizar.
          </p>
        </div>
      ) : (
        <>
          {data.accounts.length === 0 && (
            <div className="finance-onboarding panel">
              <span>
                <Icon name="Wallet" size={30} />
              </span>
              <div>
                <h2>Comece pela sua primeira conta</h2>
                <p>
                  Cadastre uma conta e seu saldo de partida. Depois, registre
                  entradas e gastos. Nenhum dado fictício é inserido
                  automaticamente.
                </p>
              </div>
              <button className="button" onClick={() => open("accounts")}>
                Cadastrar conta <Icon name="Plus" size={17} />
              </button>
            </div>
          )}
          {tab === "visao" && (
            <>
              <div className="finance-stats">
                {[
                  [
                    "Saldo consolidado",
                    consolidated,
                    "Base inicial + movimentos realizados",
                  ],
                  [
                    "Entradas do mês",
                    actual.income,
                    "Somente recebimentos realizados",
                  ],
                  [
                    "Gastos do mês",
                    actual.expense,
                    previous.expense
                      ? `${Math.round(((actual.expense - previous.expense) / previous.expense) * 100)}% em relação ao mês anterior`
                      : "Sem base de comparação anterior",
                  ],
                  [
                    "Projeção em 30 dias",
                    projected,
                    "Pendências registradas e recorrências deste mês até 30 dias à frente",
                  ],
                ].map(([title, value, note]) => (
                  <div className="stat-card" key={title}>
                    <span>{title}</span>
                    <strong className={value < 0 ? "negative" : ""}>
                      {currency(value)}
                    </strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              {preferences.widgets.includes("chart") && (
                <section className="panel finance-chart">
                  <div className="panel-heading">
                    <div>
                      <h2>Evolução do caixa</h2>
                      <p>
                        Clique em um mês para explorar. Transferências não são
                        receitas ou despesas.
                      </p>
                    </div>
                    <div className="chart-key">
                      <span>Entradas</span>
                      <span>Gastos</span>
                    </div>
                  </div>
                  <div className="chart-bars">
                    {chart.months.map((m) => {
                      const v = chart.buckets[m];
                      const max = chart.max;
                      return (
                        <button
                          key={m}
                          className={
                            m === month
                              ? "chart-column selected"
                              : "chart-column"
                          }
                          title={`Entradas ${currency(v.income)} · Gastos ${currency(v.expense)}`}
                          aria-label={`${m}: entradas ${currency(v.income)}, gastos ${currency(v.expense)}`}
                          onClick={() => navigate({ mes: m })}
                        >
                          <span className="bar-pair">
                            <i
                              style={{
                                height: Math.max(2, (v.income / max) * 130),
                              }}
                            />
                            <i
                              style={{
                                height: Math.max(2, (v.expense / max) * 130),
                              }}
                            />
                          </span>
                          <span>
                            {m.slice(5)}/{m.slice(2, 4)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="chart-summary">
                    <span>Resultado do mês</span>
                    <strong
                      className={
                        actual.income - actual.expense < 0 ? "negative" : ""
                      }
                    >
                      {currency(actual.income - actual.expense)}
                    </strong>
                  </div>
                </section>
              )}
              {preferences.widgets.includes("alerts") && (
                <section className="panel finance-alerts">
                  <div className="panel-heading">
                    <div>
                      <h2>Atenção ao que importa</h2>
                      <p>
                        Vencimentos, limites mensais e despesas que merecem
                        revisão.
                      </p>
                    </div>
                    <Icon name="Bell" size={20} />
                  </div>
                  {alerts.length ? (
                    alerts.map((a) => (
                      <div className={`finance-alert ${a.tone}`} key={a.id}>
                        <Icon name="AlertCircle" size={19} />
                        <div>
                          <strong>{a.title}</strong>
                          <p>{a.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="finance-empty-inline">
                      <Icon name="ShieldCheck" />
                      <p>
                        Nenhum alerta identificado nos registros disponíveis.
                      </p>
                    </div>
                  )}
                </section>
              )}
              {preferences.widgets.includes("goals") && (
                <Goals data={data} open={open} />
              )}
              <div className="finance-footer-note">
                Projeções dependem dos registros informados. Lançamentos
                previstos não alteram o saldo realizado. O módulo não executa
                pagamentos ou cobranças.
              </div>
            </>
          )}
          {(tab === "lancamentos" || tab === "agenda") && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {tab === "agenda"
                      ? "Agenda de vencimentos e movimentos"
                      : "Livro de lançamentos"}
                  </h2>
                  <p>
                    {filtered.length} registro(s) no período. Previsões de
                    séries são identificadas.
                  </p>
                </div>
                <button
                  className="text-link"
                  disabled={!filtered.length}
                  onClick={csv}
                >
                  <Icon name="Download" size={16} />
                  Exportar CSV
                </button>
              </div>
              <div className="finance-filters">
                <label className="search">
                  <Icon name="Search" size={16} />
                  <input
                    aria-label="Buscar lançamento"
                    value={search}
                    placeholder="Descrição ou categoria"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Situação financeira"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas as situações</option>
                  <option value="paid">Realizados</option>
                  <option value="pending">Previstos</option>
                  <option value="void">Cancelados</option>
                </select>
                <select
                  aria-label="Categoria financeira"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              {filtered.length ? (
                <>
                  <div className="finance-entry-list">
                    {filtered
                      .slice((currentPage - 1) * 20, currentPage * 20)
                      .map((e) => (
                        <article
                          className={`finance-entry ${e.status === "void" ? "void" : ""}`}
                          key={e.id}
                        >
                          <span className={`entry-kind ${e.kind}`}>
                            <Icon
                              name={
                                e.kind === "income"
                                  ? "ArrowDownLeft"
                                  : e.kind === "expense"
                                    ? "ArrowUpRight"
                                    : "ArrowLeftRight"
                              }
                              size={18}
                            />
                          </span>
                          <div className="entry-description">
                            <strong>{e.description}</strong>
                            <small>
                              {e.category} ·{" "}
                              {
                                data.accounts.find((a) => a.id === e.account_id)
                                  ?.name
                              }
                              {e.kind === "transfer"
                                ? ` → ${data.accounts.find((a) => a.id === e.to_account_id)?.name}`
                                : ""}
                            </small>
                            <small>
                              {displayDate(e.date)} ·{" "}
                              {e.virtual
                                ? "Previsão de recorrência"
                                : labels[e.status]}
                            </small>
                          </div>
                          <strong
                            className={e.kind === "income" ? "positive" : ""}
                          >
                            {e.kind === "expense"
                              ? "− "
                              : e.kind === "income"
                                ? "+ "
                                : ""}
                            {currency(e.amount_cents)}
                          </strong>
                          <div className="entry-actions">
                            {e.status === "pending" && e.date <= now && (
                              <button
                                className="text-link"
                                disabled={busy}
                                onClick={() => changeEntry(e, "paid")}
                              >
                                Confirmar
                              </button>
                            )}
                            {e.status === "void" && (
                              <button
                                className="text-link"
                                disabled={busy}
                                onClick={() => changeEntry(e, "pending")}
                              >
                                Restaurar previsão
                              </button>
                            )}
                            {e.status !== "void" && (
                              <button
                                className="icon-button"
                                disabled={busy}
                                aria-label={`Cancelar ${e.description}`}
                                onClick={() => setConfirm(e)}
                              >
                                <Icon name="X" size={15} />
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                  <div className="table-footer">
                    <span>
                      Mostrando {(currentPage - 1) * 20 + 1}–
                      {Math.min(currentPage * 20, filtered.length)} de{" "}
                      {filtered.length}
                    </span>
                    <div>
                      <button
                        className="icon-button"
                        disabled={currentPage === 1}
                        aria-label="Lançamentos anteriores"
                        onClick={() => setPage(currentPage - 1)}
                      >
                        <Icon name="ArrowLeft" size={15} />
                      </button>
                      <span>
                        {currentPage}/{pages}
                      </span>
                      <button
                        className="icon-button"
                        disabled={currentPage === pages}
                        aria-label="Próximos lançamentos"
                        onClick={() => setPage(currentPage + 1)}
                      >
                        <Icon name="ArrowRight" size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <Icon name="CalendarDays" size={32} />
                  <h3>Nenhum lançamento neste período</h3>
                  <p>
                    Registre uma entrada, um gasto ou uma recorrência para
                    organizar seu caixa.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "recorrencias" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Regras de recorrência</h2>
                  <p>
                    Salários, despesas fixas e assinaturas. O pagamento depende
                    de confirmação.
                  </p>
                </div>
                <button
                  className="button"
                  disabled={!canWrite}
                  onClick={() => open("series", "expense")}
                >
                  Nova recorrência <Icon name="Plus" size={16} />
                </button>
              </div>
              {data.series.length ? (
                data.series.map((s) => (
                  <div className="finance-rule" key={s.id}>
                    <span className="quick-icon">
                      <Icon name="RefreshCw" size={20} />
                    </span>
                    <div>
                      <strong>{s.description}</strong>
                      <p>
                        {currency(s.amount_cents)} ·{" "}
                        {s.frequency === "monthly"
                          ? "Mensal"
                          : s.frequency === "weekly"
                            ? "Semanal"
                            : "Anual"}{" "}
                        · {s.active ? "Ativa" : "Pausada"}
                        {s.end_date ? ` · até ${displayDate(s.end_date)}` : ""}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => open("series", s.kind, s)}
                    >
                      Editar
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => toggleSeries(s)}
                    >
                      {s.active ? "Pausar" : "Retomar"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <h3>Sem recorrências cadastradas</h3>
                  <p>
                    Cadastre uma regra para visualizar previsões e confirmar as
                    ocorrências sem duplicar lançamentos.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "planejamento" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Limites mensais por categoria</h2>
                    <p>
                      Alertas a partir de 80% do limite. Não bloqueiam despesas.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => open("budgets")}
                  >
                    Novo limite <Icon name="Plus" size={16} />
                  </button>
                </div>
                {data.budgets.filter((b) => b.month === month).length ? (
                  data.budgets
                    .filter((b) => b.month === month)
                    .map((b) => {
                      const spent = selected
                        .filter(
                          (e) =>
                            e.status === "paid" &&
                            e.kind === "expense" &&
                            e.category === b.category,
                        )
                        .reduce((n, e) => n + e.amount_cents, 0);
                      return (
                        <div className="budget-row" key={b.id}>
                          <div>
                            <strong>{b.category}</strong>
                            <span>
                              {currency(spent)} de {currency(b.limit_cents)}
                            </span>
                          </div>
                          <progress
                            max={b.limit_cents}
                            value={Math.min(spent, b.limit_cents)}
                            aria-label={`Uso do limite de ${b.category}`}
                          />
                          <button
                            className="text-link"
                            onClick={() => open("budgets", null, b)}
                          >
                            Editar limite
                          </button>
                        </div>
                      );
                    })
                ) : (
                  <div className="finance-empty-inline">
                    <p>Nenhum limite definido para este mês.</p>
                  </div>
                )}
              </section>
              <Goals data={data} open={open} />
            </>
          )}
          {tab === "contas" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Contas e saldos</h2>
                    <p>
                      Saldos derivados do livro. Uma transferência gera um único
                      registro.
                    </p>
                  </div>
                  <button className="button" onClick={() => open("accounts")}>
                    Nova conta <Icon name="Plus" size={16} />
                  </button>
                </div>
                <div className="account-grid">
                  {data.accounts.map((a) => (
                    <div className="account-card" key={a.id}>
                      <Icon
                        name={a.type === "card" ? "CreditCard" : "Wallet"}
                        size={24}
                      />
                      <strong>{a.name}</strong>
                      <span
                        className={accountBalances[a.id] < 0 ? "negative" : ""}
                      >
                        {currency(accountBalances[a.id])}
                      </span>
                      <small>Base inicial: {currency(a.opening_cents)}</small>
                    </div>
                  ))}
                </div>
                <div className="finance-account-actions">
                  <button
                    className="button secondary"
                    disabled={data.accounts.length < 2 || busy}
                    onClick={() => open("entries", "transfer")}
                  >
                    Transferir entre contas{" "}
                    <Icon name="ArrowLeftRight" size={16} />
                  </button>
                  <button
                    className="text-link"
                    onClick={() =>
                      download(
                        `sr-service-financeiro-${now}.json`,
                        JSON.stringify(
                          {
                            schema: 1,
                            exported_at: new Date().toISOString(),
                            ...data,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    Exportar dados em JSON <Icon name="Download" size={16} />
                  </button>
                </div>
              </section>
            </>
          )}
        </>
      )}
      {model && (
        <Modal
          title={
            {
              entries:
                model.kind === "income"
                  ? "Registrar entrada"
                  : model.kind === "transfer"
                    ? "Transferir entre contas"
                    : "Registrar gasto",
              accounts: "Cadastrar conta",
              series: model.value ? "Editar recorrência" : "Nova recorrência",
              budgets: "Limite mensal",
              goals: "Meta financeira",
            }[model.type]
          }
          onClose={() => {
            if (!busy) setModel(null);
          }}
        >
          <FinanceForm
            key={model.id}
            model={model}
            accounts={data.accounts}
            month={month}
            onSave={save}
            busy={busy}
            onClose={() => setModel(null)}
          />
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Cancelar lançamento?"
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>
            O registro “{confirm.description}” será mantido como cancelado e
            deixará de compor o saldo e as previsões. Nada será apagado.
          </p>
          <ErrorBox>{operationError}</ErrorBox>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Voltar
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => changeEntry(confirm, "void")}
            >
              Confirmar cancelamento
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Goals({ data, open }) {
  return (
    <section className="panel finance-goals">
      <div className="panel-heading">
        <div>
          <h2>Metas e reservas</h2>
          <p>
            Acompanhamento informado por você, sem duplicar o saldo das contas.
          </p>
        </div>
        <button className="text-link" onClick={() => open("goals")}>
          Nova meta <Icon name="Plus" size={16} />
        </button>
      </div>
      {data.goals.length ? (
        data.goals.map((g) => (
          <div className="budget-row" key={g.id}>
            <div>
              <strong>{g.name}</strong>
              <span>
                {currency(g.saved_cents)} de {currency(g.target_cents)}
              </span>
            </div>
            <progress
              value={g.saved_cents}
              max={g.target_cents}
              aria-label={`Progresso de ${g.name}`}
            />
            <button
              className="text-link"
              onClick={() => open("goals", null, g)}
            >
              Atualizar reserva
            </button>
          </div>
        ))
      ) : (
        <div className="finance-empty-inline">
          <Icon name="Target" size={24} />
          <p>Crie uma meta e acompanhe quanto já reservou.</p>
        </div>
      )}
    </section>
  );
}
