import test from "node:test";
import assert from "node:assert/strict";
import {
  cents,
  addMonths,
  monthRange,
  validDate,
  installments,
  balances,
  totals,
  occurrences,
  forecast,
  insights,
  validate,
} from "../src/finance/domain.js";
const accounts = [
  { id: "cash", name: "Caixa", opening_cents: 10000 },
  { id: "bank", name: "Banco", opening_cents: 0 },
];
const entry = {
  id: "entry",
  kind: "expense",
  description: "Ferramentas",
  category: "Equipamentos",
  account_id: "cash",
  to_account_id: "",
  amount_cents: 100,
  date: "2026-01-31",
  status: "paid",
  series_id: "",
};
test("money uses exact cents and rejects ambiguous or unsafe values", () => {
  assert.equal(cents("0,29"), 29);
  assert.equal(cents("-12.05"), -1205);
  assert.equal(cents("100"), 10000);
  for (const value of [
    "1.234",
    "1.000,00",
    "NaN",
    "Infinity",
    "99999999999999",
    "",
  ])
    assert.throws(() => cents(value));
});
test("calendar clamps monthly dates from the original anchor, including leap years", () => {
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2024-01-31", 2), "2024-03-31");
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.deepEqual(monthRange("2026-02"), ["2026-02-01", "2026-02-28"]);
  assert.throws(() => monthRange("2026-13"));
});
test("installments preserve the total to the cent and one payment cannot realize future parcels", () => {
  const rows = installments({ ...entry, amount_cents: 100 }, 3, "purchase");
  assert.deepEqual(
    rows.map((r) => r.amount_cents),
    [34, 33, 33],
  );
  assert.equal(
    rows.reduce((n, r) => n + r.amount_cents, 0),
    100,
  );
  assert.deepEqual(
    rows.map((r) => r.date),
    ["2026-01-31", "2026-02-28", "2026-03-31"],
  );
  assert.deepEqual(
    rows.map((r) => r.status),
    ["paid", "pending", "pending"],
  );
  assert.equal(new Set(rows.map((r) => r.id)).size, 3);
  assert.throws(() => installments({ ...entry, amount_cents: 2 }, 3, "x"));
});
test("transfers conserve consolidated balance, cancelled and pending entries do not affect actuals", () => {
  const entries = [
    { ...entry, kind: "income", amount_cents: 5000 },
    {
      ...entry,
      id: "transfer",
      kind: "transfer",
      to_account_id: "bank",
      amount_cents: 3000,
    },
    { ...entry, id: "expense", amount_cents: 2000 },
    { ...entry, id: "pending", amount_cents: 999999, status: "pending" },
    { ...entry, id: "void", amount_cents: 999999, status: "void" },
  ];
  const b = balances(accounts, entries, "2026-12-31");
  assert.deepEqual(b, { cash: 10000, bank: 3000 });
  assert.deepEqual(totals(entries, "2026-01-01", "2026-01-31"), {
    income: 5000,
    expense: 2000,
  });
  assert.equal(
    Object.values(b).reduce((a, b) => a + b),
    13000,
  );
});
const series = {
  id: "rent",
  kind: "expense",
  description: "Aluguel",
  category: "Moradia",
  account_id: "bank",
  amount_cents: 20000,
  start_date: "2024-01-31",
  end_date: "",
  frequency: "monthly",
  active: true,
};
test("recurrence projections are deterministic, suppress recorded or cancelled occurrences and respect pause/end", () => {
  const expected = occurrences([series], [], "2024-01-01", "2024-03-31");
  assert.deepEqual(
    expected.map((e) => e.date),
    ["2024-01-31", "2024-02-29", "2024-03-31"],
  );
  assert.equal(expected[1].id, "rent_2024-02-29");
  assert.equal(
    occurrences(
      [series],
      [{ id: "rent_2024-02-29", status: "void" }],
      "2024-01-01",
      "2024-03-31",
    ).length,
    2,
  );
  assert.equal(
    occurrences([{ ...series, active: false }], [], "2024-01-01", "2024-03-31")
      .length,
    0,
  );
  assert.equal(
    occurrences(
      [{ ...series, end_date: "2024-02-15" }],
      [],
      "2024-01-01",
      "2024-03-31",
    ).length,
    1,
  );
  assert.throws(() => occurrences([series], [], "2024-01-01", "2026-01-01"));
  assert.equal(
    occurrences(
      [{ ...series, start_date: "2000-01-01", frequency: "weekly" }],
      [],
      "2026-10-01",
      "2026-10-31",
    ).length,
    5,
  );
});
test("forecasts and budget alerts derive only from supplied data", () => {
  const pending = [
    { ...entry, date: "2026-10-25", status: "pending", amount_cents: 500 },
    {
      ...entry,
      kind: "transfer",
      date: "2026-10-25",
      status: "pending",
      amount_cents: 99999,
    },
  ];
  assert.equal(forecast(10000, pending, "2026-10-01", "2026-10-31"), 9500);
  const alerts = insights(
    [{ ...entry, date: "2026-10-01", amount_cents: 900 }],
    [
      {
        id: "budget",
        month: "2026-10",
        category: "Equipamentos",
        limit_cents: 1000,
      },
    ],
    "2026-10",
    "2026-10-23",
  );
  assert.equal(alerts[0].title, "Equipamentos: 90% do limite");
  assert.equal(insights([], [], "2026-10").length, 0);
});
test("ledger validation rejects self transfers, unregistered accounts and invalid recurrence dates", () => {
  assert.doesNotThrow(() => validate("entries", entry, accounts));
  assert.throws(() =>
    validate(
      "entries",
      { ...entry, kind: "transfer", to_account_id: "cash" },
      accounts,
    ),
  );
  assert.throws(() =>
    validate("entries", { ...entry, account_id: "foreign" }, accounts),
  );
  assert.throws(() =>
    validate("entries", { ...entry, amount_cents: 1.1 }, accounts),
  );
  assert.throws(() =>
    validate("series", { ...series, end_date: "2023-01-01" }, accounts),
  );
  assert.throws(
    () => validate("entries", { ...entry, date: "2099-01-01" }, accounts),
    /previsto/,
  );
});
