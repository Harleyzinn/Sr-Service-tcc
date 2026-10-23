import test from "node:test";
import assert from "node:assert/strict";
import { quotesCsv, sortQuotes, validateQuote } from "../src/domain.js";
import {
  draftKey,
  saveDraft,
  readDraft,
  clearUserDrafts,
} from "../src/draft.js";
test("quote validation rejects absent descriptions, whitespace and oversized fields", () => {
  const q = {
    service: "Peças e componentes",
    equipment: "Talha",
    company: "Indústria",
    contact_name: "Ana Silva",
    email: "ana@example.com",
    phone: "11999999999",
    address: "Rua A, 1",
    description: "Necessitamos de peças para uma talha elétrica.",
  };
  assert.throws(
    () => validateQuote({ ...q, description: undefined }),
    /20 caracteres/,
  );
  assert.throws(
    () => validateQuote({ ...q, description: " ".repeat(20) }),
    /20 caracteres/,
  );
  assert.throws(
    () => validateQuote({ ...q, equipment: "a".repeat(201) }),
    /limite/,
  );
});
test("sort is stable, handles absent values, and does not mutate source", () => {
  const q = [
    { id: "a", created_at: "2026-10-01", amount: null },
    { id: "b", created_at: "2026-10-03", amount: 50 },
    { id: "c", created_at: "2026-10-02", updated_at: "2026-10-04", amount: 0 },
  ];
  assert.deepEqual(
    sortQuotes(q).map((q) => q.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    sortQuotes(q, "antigos").map((q) => q.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    sortQuotes(q, "valor").map((q) => q.id),
    ["b", "c", "a"],
  );
  assert.equal(sortQuotes(q, "atualizados")[0].id, "c");
  assert.equal(q[0].id, "a");
});
test("CSV preserves quotes and newlines and escapes spreadsheet formula injection", () => {
  const csv = quotesCsv([
    {
      number: 1,
      service: "Peças",
      equipment: 'Talha "A"\n5t',
      company: ' =HYPERLINK("x")',
      contact_name: "+cmd",
      created_at: "2026-10-01",
      status: "Recebido",
      amount: 12.5,
    },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"12,50"'));
  assert.ok(csv.includes('Talha ""A""\n5t'));
  assert.ok(csv.includes("' =HYPERLINK"));
  assert.ok(csv.includes("'+cmd"));
});
test("drafts isolate accounts and demo, expire and never restore consent or review confirmation", () => {
  const values = {};
  globalThis.sessionStorage = {
    getItem: (k) => values[k] ?? null,
    setItem: (k, v) => {
      values[k] = v;
      globalThis.sessionStorage[k] = v;
    },
    removeItem: (k) => {
      delete values[k];
      delete globalThis.sessionStorage[k];
    },
  };
  const a = draftKey("alice", null),
    b = draftKey("bob", null),
    demo = draftKey("alice", "customer");
  assert.notEqual(a, demo);
  saveDraft(a, { equipment: "Talha", consent: "on" }, 3);
  saveDraft(b, { equipment: "Ponte" }, 1);
  assert.equal(readDraft(a).step, 2);
  assert.equal(readDraft(a).form.consent, undefined);
  clearUserDrafts("alice", null);
  assert.equal(readDraft(a), null);
  assert.equal(readDraft(b).form.equipment, "Ponte");
  values[b] = JSON.stringify({
    version: 1,
    savedAt: Date.now() - 86400001,
    form: {},
  });
  assert.equal(readDraft(b), null);
  delete globalThis.sessionStorage;
});
