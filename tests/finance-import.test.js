import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, prepareImport } from "../src/finance/csv-import.js";
import { incrementalLoader } from "../src/finance/incremental-loader.js";
const accounts = [{ id: "bank", opening_cents: 0 }];
const header = "Data;Descrição;Categoria;Tipo;Situação;Valor (R$)\r\n";

test("CSV handles UTF-8 BOM, escaped quotes, multiline cells and comma delimiter without evaluation", () => {
  const rows = parseCsv(
    "\uFEFF" +
      header +
      '2026-01-01;"Parafuso; medida ""A""\nsegunda linha";Outros;Gasto;Previsto;12,50\r\n',
  );
  assert.equal(rows[0].descricao, 'Parafuso; medida "A"\nsegunda linha');
  assert.equal(rows[0]["valor (r$)"], "12,50");
  const comma = parseCsv(
    'Data,Descrição,Tipo,Valor (R$)\n2026-01-01,=SUM(A1),Gasto,"12,50"',
  );
  assert.equal(comma[0].descricao, "=SUM(A1)");
});

test("CSV rejects malformed structure and oversized imports before producing writable rows", () => {
  for (const text of [
    "",
    "Data;Tipo\n2026-01-01;Gasto",
    header + '2026-01-01;"Sem fechamento',
    header + '2026-01-01;"a"b;Outros;Gasto;Previsto;1',
    header + "2026-01-01;Campos insuficientes",
    "Data;Data;Descrição;Tipo;Valor (R$)\n1;1;a;b;1",
    header + "2026-01-01;Exemplo;Outros;Gasto;Previsto;1\n".repeat(101),
    "a".repeat(1048577),
  ])
    assert.throws(() => parseCsv(text));
});

test("CSV previews validate cents, calendar, references, statuses and never turn virtual forecasts into payments", async () => {
  const source =
    header +
    [
      "01/01/2026;Despesa válida;Outros;Gasto;Realizado;1.234,56",
      "2026-02-31;Data inválida;Outros;Gasto;Previsto;1",
      "2026-01-01;Transferência;Outros;Transferência;Realizado;1",
      "2026-01-01;Ocorrência;Outros;Entrada;Previsão de recorrência;1",
      "2026-01-01;Negativo;Outros;Gasto;Realizado;-1",
      "2099-01-01;Pagamento futuro;Outros;Gasto;Realizado;1",
    ].join("\n");
  const result = await prepareImport(source, "bank", accounts, []);
  assert.equal(result.total, 6);
  assert.equal(result.errors.length, 5);
  assert.equal(result.rows[0].amount_cents, 123456);
  assert.equal(result.rows[0].date, "2026-01-01");
  assert.equal(result.rows[0].status, "paid");
  await assert.rejects(prepareImport(source, "other", accounts, []));
  const pending = await prepareImport(
    "Data;Descrição;Tipo;Valor (R$)\n2099-01-01;Futuro previsto;Gasto;2",
    "bank",
    accounts,
    [],
  );
  assert.equal(pending.rows[0].status, "pending");
});

test("import identities survive row reordering and status changes, preserve identical source rows, flag manual similarities", async () => {
  const a = "2026-01-01;Ferramentas;Outros;Gasto;Realizado;10";
  const b = "2026-01-02;Recebimento;Serviços;Entrada;Realizado;100";
  const first = await prepareImport(
    header + [a, b, a].join("\n"),
    "bank",
    accounts,
    [],
  );
  assert.equal(new Set(first.rows.map((r) => r.id)).size, 3);
  const existing = first.rows.map((r) => ({ ...r, status: "void" }));
  const retry = await prepareImport(
    header + [b, a, a].join("\n"),
    "bank",
    accounts,
    existing,
  );
  assert.ok(retry.rows.every((r) => r.alreadyImported));
  const manual = await prepareImport(header + a, "bank", accounts, [
    { ...first.rows[0], id: "manual-id" },
  ]);
  assert.equal(manual.rows[0].similar, true);
  assert.equal(manual.rows[0].alreadyImported, false);
});

function fixture() {
  let data = {
    accounts: [{ id: "bank", version: 1, time: 1 }],
    entries: Array.from({ length: 600 }, (_, i) => ({
      id: String(i).padStart(4, "0"),
      version: 1,
      time: i + 1,
    })),
  };
  let fail = false;
  const loader = incrementalLoader(
    ["accounts", "entries"],
    async (kind, { since, after, size }) => {
      if (fail && kind === "accounts") throw new Error("rede indisponível");
      const result = data[kind]
        .filter((r) => !since || r.time >= since)
        .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
      const start = after ? result.findIndex((r) => r.id === after) + 1 : 0;
      const rows = result.slice(start, start + size);
      return { rows, after: rows.at(-1)?.id, watermark: rows.at(-1)?.time };
    },
  );
  return {
    loader,
    update: (next) => {
      data = next(data);
    },
    fail: (value) => {
      fail = value;
    },
  };
}

test("incremental queries preserve complete history while receiving only changed documents", async () => {
  const f = fixture();
  const first = await f.loader.load();
  assert.equal(first.entries.length, 600);
  const baseline = f.loader.getReadMetrics();
  assert.equal(baseline.documents, 601);
  f.update((data) => ({
    ...data,
    entries: data.entries
      .map((r) => (r.id === "0000" ? { ...r, version: 2, time: 601 } : r))
      .concat({ id: "new", version: 1, time: 601 }),
  }));
  const next = await f.loader.load();
  assert.equal(next.entries.length, 601);
  assert.equal(next.entries.find((r) => r.id === "0000").version, 2);
  assert.equal(f.loader.getReadMetrics().documents - baseline.documents, 4);
  const repeat = await f.loader.load();
  assert.equal(repeat.entries.length, 601);
  assert.equal(new Set(repeat.entries.map((r) => r.id)).size, 601);
});

test("failed incremental reads do not advance cursors and full reload reconciles an administrative removal", async () => {
  const f = fixture();
  await f.loader.load();
  f.update((data) => ({
    ...data,
    entries: data.entries.concat({ id: "new", version: 1, time: 700 }),
  }));
  f.fail(true);
  await assert.rejects(f.loader.load(), /rede/);
  f.fail(false);
  assert.equal((await f.loader.load()).entries.length, 601);
  f.update((data) => ({
    ...data,
    entries: data.entries.filter((r) => r.id !== "new"),
  }));
  assert.equal((await f.loader.load()).entries.length, 601);
  assert.equal((await f.loader.load({ full: true })).entries.length, 600);
});

test("incremental loading refuses overflowing collections and terminates continuously moving pagination", async () => {
  const overflowing = incrementalLoader(
    ["entries"],
    async () => ({
      rows: [
        { id: "a", version: 1 },
        { id: "b", version: 1 },
      ],
      watermark: 1,
    }),
    1,
  );
  await assert.rejects(overflowing.load(), /excede/);
  let page = 0;
  const moving = incrementalLoader(["entries"], async () => ({
    rows: Array.from({ length: 250 }, (_, i) => ({
      id: `item-${i}`,
      version: page + 1,
    })),
    after: String(++page),
    watermark: page,
  }));
  await assert.rejects(moving.load(), /mudando/);
});
