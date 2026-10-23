export const categories = [
  "Serviços",
  "Salário",
  "Vendas",
  "Alimentação",
  "Transporte",
  "Moradia",
  "Equipamentos",
  "Impostos",
  "Assinaturas",
  "Outros",
];
export const collections = [
  "accounts",
  "entries",
  "series",
  "budgets",
  "goals",
];
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validDate(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function cents(value) {
  const text = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Informe um valor com até duas casas decimais.");
  const negative = text.startsWith("-");
  const [whole, decimal = ""] = text.replace("-", "").split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 99999999999)
    throw new Error("Valor fora do limite.");
  return negative ? -amount : amount;
}
export const currency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export const inputMoney = (value) => (value / 100).toFixed(2);
export function monthRange(month) {
  if (!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Período inválido.");
  const [y, m] = month.split("-").map(Number);
  return [
    month + "-01",
    `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`,
  ];
}
export function addMonths(date, offset) {
  const [y, m, d] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}
export function addDays(date, days) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function text(value, min, max, label) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new Error(`Confira ${label}.`);
}
function amount(value, zero = false) {
  if (
    !Number.isSafeInteger(value) ||
    value < (zero ? 0 : 1) ||
    value > 99999999999
  )
    throw new Error("Informe um valor válido em centavos.");
}
export function validate(kind, data, accounts = []) {
  if (kind === "accounts") {
    text(data.name, 1, 80, "o nome da conta");
    if (
      !["checking", "cash", "card"].includes(data.type) ||
      !Number.isSafeInteger(data.opening_cents) ||
      Math.abs(data.opening_cents) > 99999999999
    )
      throw new Error("Conta inválida.");
    return;
  }
  if (kind === "goals") {
    text(data.name, 1, 80, "o nome da meta");
    amount(data.target_cents);
    amount(data.saved_cents, true);
    if (data.saved_cents > data.target_cents)
      throw new Error("O valor reservado não pode superar a meta.");
    return;
  }
  if (kind === "budgets") {
    monthRange(data.month);
    if (!categories.includes(data.category))
      throw new Error("Categoria inválida.");
    amount(data.limit_cents);
    return;
  }
  text(data.description, 3, 160, "a descrição");
  amount(data.amount_cents);
  if (!categories.includes(data.category))
    throw new Error("Categoria inválida.");
  if (!accounts.some((a) => a.id === data.account_id))
    throw new Error("Selecione uma conta cadastrada.");
  if (kind === "series") {
    if (
      !["income", "expense"].includes(data.kind) ||
      !["monthly", "weekly", "yearly"].includes(data.frequency) ||
      typeof data.active !== "boolean" ||
      !validDate(data.start_date) ||
      (data.end_date !== "" &&
        (!validDate(data.end_date) || data.end_date < data.start_date))
    )
      throw new Error("Confira a frequência e as datas da recorrência.");
    return;
  }
  if (
    kind !== "entries" ||
    !["income", "expense", "transfer"].includes(data.kind) ||
    !["paid", "pending", "void"].includes(data.status) ||
    !validDate(data.date)
  )
    throw new Error("Lançamento inválido.");
  if (
    data.kind === "transfer" &&
    (!accounts.some((a) => a.id === data.to_account_id) ||
      data.to_account_id === data.account_id)
  )
    throw new Error("Escolha contas diferentes para a transferência.");
  if (data.kind !== "transfer" && data.to_account_id !== "")
    throw new Error("Conta de destino inesperada.");
  if (data.status === "paid" && data.date > today())
    throw new Error("Use o status previsto para uma data futura.");
}
export function installments(entry, count, id) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 36 ||
    entry.amount_cents < count
  )
    throw new Error(
      "Use entre 1 e 36 parcelas, com pelo menos um centavo por parcela.",
    );
  const base = Math.floor(entry.amount_cents / count);
  const remainder = entry.amount_cents % count;
  return Array.from({ length: count }, (_, i) => ({
    ...entry,
    id: count === 1 ? id : `${id}_${i + 1}`,
    amount_cents: base + (i < remainder ? 1 : 0),
    date: addMonths(entry.date, i),
    status: i === 0 ? entry.status : "pending",
    description:
      count === 1
        ? entry.description
        : `${entry.description} (${i + 1}/${count})`,
  }));
}
export function occurrences(series, entries, from, to) {
  if (!validDate(from) || !validDate(to) || from > to)
    throw new Error("Intervalo inválido.");
  if (new Date(to) - new Date(from) > 366 * 86400000)
    throw new Error("Consulte no máximo 366 dias por vez.");
  const existing = new Set(entries.map((e) => e.id));
  const result = [];
  for (const s of series) {
    if (!s.active) continue;
    let n = Math.max(
      0,
      s.frequency === "weekly"
        ? Math.floor((new Date(from) - new Date(s.start_date)) / 604800000) - 1
        : Math.floor(
            ((Number(from.slice(0, 4)) - Number(s.start_date.slice(0, 4))) *
              12 +
              Number(from.slice(5, 7)) -
              Number(s.start_date.slice(5, 7))) /
              (s.frequency === "yearly" ? 12 : 1),
          ) - 1,
    );
    let date =
      s.frequency === "weekly"
        ? addDays(s.start_date, n * 7)
        : addMonths(s.start_date, n * (s.frequency === "yearly" ? 12 : 1));
    while (date <= to && (!s.end_date || date <= s.end_date) && n < 5300) {
      const id = `${s.id}_${date}`;
      if (date >= from && !existing.has(id))
        result.push({
          id,
          kind: s.kind,
          description: s.description,
          category: s.category,
          account_id: s.account_id,
          to_account_id: "",
          amount_cents: s.amount_cents,
          date,
          status: "pending",
          series_id: s.id,
          virtual: true,
          version: 0,
        });
      n++;
      date =
        s.frequency === "weekly"
          ? addDays(s.start_date, n * 7)
          : addMonths(s.start_date, n * (s.frequency === "yearly" ? 12 : 1));
    }
  }
  return result;
}
export function balances(accounts, entries, asOf = today()) {
  const result = Object.fromEntries(
    accounts.map((a) => [a.id, a.opening_cents]),
  );
  for (const e of entries) {
    if (e.status !== "paid" || e.date > asOf) continue;
    if (e.kind === "income")
      result[e.account_id] = (result[e.account_id] || 0) + e.amount_cents;
    else result[e.account_id] = (result[e.account_id] || 0) - e.amount_cents;
    if (e.kind === "transfer")
      result[e.to_account_id] = (result[e.to_account_id] || 0) + e.amount_cents;
  }
  return result;
}
export function totals(entries, from, to) {
  return entries.reduce(
    (s, e) => {
      if (e.status === "paid" && e.date >= from && e.date <= to) {
        if (e.kind === "income") s.income += e.amount_cents;
        if (e.kind === "expense") s.expense += e.amount_cents;
      }
      return s;
    },
    { income: 0, expense: 0 },
  );
}
export function forecast(balance, entries, from, to) {
  return entries
    .filter(
      (e) =>
        e.status === "pending" &&
        e.date >= from &&
        e.date <= to &&
        e.kind !== "transfer",
    )
    .reduce(
      (sum, e) =>
        sum + (e.kind === "income" ? e.amount_cents : -e.amount_cents),
      balance,
    );
}
export function insights(entries, budgets, month, now = today()) {
  const [from, to] = monthRange(month);
  const alerts = [];
  const due = entries.filter(
    (e) => e.status === "pending" && e.date <= addDays(now, 7),
  );
  if (due.length)
    alerts.push({
      id: "due",
      tone: "warning",
      title: `${due.length} conta(s) vencida(s) ou nos próximos 7 dias`,
      text: "Valores previstos não entram no saldo realizado. Confirme os pagamentos quando ocorrerem.",
    });
  for (const b of budgets.filter((b) => b.month === month)) {
    const spent = entries
      .filter(
        (e) =>
          e.kind === "expense" &&
          e.status === "paid" &&
          e.category === b.category &&
          e.date >= from &&
          e.date <= to,
      )
      .reduce((n, e) => n + e.amount_cents, 0);
    if (spent >= b.limit_cents * 0.8)
      alerts.push({
        id: b.id,
        tone: spent >= b.limit_cents ? "danger" : "warning",
        title: `${b.category}: ${Math.round((spent / b.limit_cents) * 100)}% do limite`,
        text: `${currency(spent)} realizados de ${currency(b.limit_cents)} planejados.`,
      });
  }
  const historical = entries.filter(
    (e) => e.status === "paid" && e.kind === "expense" && e.date < from,
  );
  for (const category of categories) {
    const values = historical
      .filter((e) => e.category === category)
      .map((e) => e.amount_cents)
      .sort((a, b) => a - b);
    if (values.length < 3) continue;
    const median = values[Math.floor(values.length / 2)];
    const unusual = entries.find(
      (e) =>
        e.status === "paid" &&
        e.kind === "expense" &&
        e.category === category &&
        e.date >= from &&
        e.date <= to &&
        e.amount_cents > median * 2,
    );
    if (unusual)
      alerts.push({
        id: `unusual-${category}`,
        tone: "info",
        title: `Despesa acima do histórico em ${category}`,
        text: `${unusual.description}: mais que o dobro da mediana de ${values.length} despesas anteriores. Verifique se o lançamento está correto.`,
      });
  }
  return alerts;
}
export function entryPayload(entry) {
  return Object.fromEntries(
    [
      "kind",
      "description",
      "category",
      "account_id",
      "to_account_id",
      "amount_cents",
      "date",
      "status",
      "series_id",
    ].map((k) => [k, entry[k]]),
  );
}
