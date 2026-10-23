import { cents, entryPayload, today, validate } from "./domain.js";
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export const csvTemplate = () =>
  `\uFEFFData;Descrição;Categoria;Tipo;Situação;Valor (R$)\r\n${today()};Exemplo de gasto;Outros;Gasto;Previsto;12,50\r\n`;
export function parseCsv(source) {
  if (
    typeof source !== "string" ||
    source.length > 1048576 ||
    new TextEncoder().encode(source).byteLength > 1048576
  )
    throw new Error("Use um CSV UTF-8 de até 1 MB.");
  const text = source.replace(/^\uFEFF/, "");
  let quoted = false,
    semicolons = 0,
    commas = 0;
  for (
    let i = 0;
    i < text.length && text[i] !== "\n" && text[i] !== "\r";
    i++
  ) {
    if (text[i] === '"') quoted = !quoted;
    if (!quoted && text[i] === ";") semicolons++;
    if (!quoted && text[i] === ",") commas++;
  }
  const delimiter = semicolons >= commas ? ";" : ",";
  const rows = [];
  let row = [],
    cell = "",
    closed = false;
  quoted = false;
  function finishRow() {
    row.push(cell);
    cell = "";
    closed = false;
    if (row.some((v) => v.trim())) rows.push(row);
    row = [];
    if (rows.length > 101)
      throw new Error("Importe no máximo 100 lançamentos por arquivo.");
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (c === "\r" || c === "\n") {
      finishRow();
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else if (closed) {
      if (c.trim())
        throw new Error("CSV inválido: há texto depois de fechar as aspas.");
    } else if (c === '"') {
      if (cell) throw new Error("CSV inválido: confira as aspas dos campos.");
      quoted = true;
    } else cell += c;
  }
  if (quoted) throw new Error("CSV inválido: há aspas sem fechamento.");
  if (cell || row.length) finishRow();
  if (rows.length < 2)
    throw new Error(
      "O arquivo precisa ter cabeçalho e pelo menos um lançamento.",
    );
  const headers = rows.shift().map(normalize);
  if (new Set(headers).size !== headers.length)
    throw new Error("O cabeçalho contém colunas repetidas.");
  for (const required of ["data", "descricao", "tipo", "valor (r$)"]) {
    if (!headers.includes(required))
      throw new Error(
        `Coluna obrigatória ausente: ${required}. Baixe o modelo para conferir o formato.`,
      );
  }
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(
        `Registro ${index + 1}: quantidade de colunas diferente do cabeçalho.`,
      );
    return Object.fromEntries(
      headers.map((header, i) => [header, values[i].trim()]),
    );
  });
}
function economicKey(entry) {
  const { status, ...payload } = entryPayload(entry);
  return JSON.stringify(payload);
}
async function fingerprint(text) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function prepareImport(source, accountId, accounts, entries) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Abra o portal em HTTPS ou localhost para importar com segurança.",
    );
  if (!accounts.some((a) => a.id === accountId))
    throw new Error("Selecione a conta de destino da importação.");
  const parsed = parseCsv(source);
  const knownIds = new Set(entries.map((e) => e.id));
  const knownEconomic = new Set(entries.map(economicKey));
  const counts = new Map();
  const rows = [],
    errors = [];
  for (let i = 0; i < parsed.length; i++) {
    const value = parsed[i];
    try {
      const kind = { entrada: "income", gasto: "expense" }[
        normalize(value.tipo)
      ];
      if (!kind)
        throw new Error(
          "Tipo deve ser Entrada ou Gasto. Transferências exigem origem e destino e devem ser registradas pelo formulário.",
        );
      const status = {
        realizado: "paid",
        previsto: "pending",
        cancelado: "void",
      }[normalize(value.situacao || "Previsto")];
      if (!status)
        throw new Error(
          "Situação deve ser Realizado, Previsto ou Cancelado. Previsões de recorrências não podem ser importadas como pagamentos.",
        );
      const date = /^\d{2}\/\d{2}\/20\d{2}$/.test(value.data)
        ? value.data.split("/").reverse().join("-")
        : value.data;
      let amount = value["valor (r$)"];
      if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(amount))
        amount = amount.replaceAll(".", "");
      const entry = {
        kind,
        description: value.descricao,
        category: value.categoria || "Outros",
        account_id: accountId,
        to_account_id: "",
        amount_cents: cents(amount),
        date,
        status,
        series_id: "",
      };
      validate("entries", entry, accounts);
      const key = economicKey(entry);
      const index = (counts.get(key) || 0) + 1;
      counts.set(key, index);
      const id = "csv_" + (await fingerprint(key + ":" + index));
      rows.push({
        ...entry,
        id,
        record: i + 1,
        alreadyImported: knownIds.has(id),
        similar: knownEconomic.has(key) && !knownIds.has(id),
      });
    } catch (error) {
      errors.push({ record: i + 1, message: error.message });
    }
  }
  return { rows, errors, total: parsed.length };
}
