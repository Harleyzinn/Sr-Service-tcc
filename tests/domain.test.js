import test from "node:test";
import assert from "node:assert/strict";
import {
  validDocument,
  validateProfile,
  validateQuote,
  filterQuotes,
  reference,
} from "../src/domain.js";
test("CPF and CNPJ check digits reject malformed and repeated documents", () => {
  assert.equal(validDocument("529.982.247-25"), true);
  assert.equal(validDocument("11.222.333/0001-81"), true);
  for (const doc of [
    "111.111.111-11",
    "00000000000",
    "52998224724",
    "11222333000182",
    "123",
    "1234567890X",
  ])
    assert.equal(validDocument(doc), false, doc);
});
test("profile validates full name, phone and optional document", () => {
  assert.doesNotThrow(() =>
    validateProfile({
      full_name: "Mariana Oliveira",
      phone: "(11) 99999-9999",
      document: "",
    }),
  );
  assert.throws(
    () => validateProfile({ full_name: "Mariana", phone: "11999999999" }),
    /sobrenome/,
  );
  assert.throws(
    () => validateProfile({ full_name: "Mariana Oliveira", phone: "123" }),
    /telefone/,
  );
  assert.throws(
    () =>
      validateProfile({
        full_name: "Mariana Oliveira",
        phone: "11999999999",
        document: "11111111111",
      }),
    /CPF/,
  );
});
const quote = {
  service: "Manutenção preventiva e corretiva",
  equipment: "Ponte rolante",
  description: "Precisamos avaliar os freios e o motor da ponte.",
  company: "Empresa Exemplo",
  contact_name: "Mariana Oliveira",
  email: "mariana@example.com",
  phone: "11999999999",
  address: "Rua Industrial, 123",
};
test("quote cannot submit incomplete contact or technical information", () => {
  assert.doesNotThrow(() => validateQuote(quote));
  for (const [field, value] of [
    ["service", "Inválido"],
    ["description", "Curta"],
    ["equipment", ""],
    ["email", "sem-arroba"],
    ["phone", "123"],
    ["address", ""],
    ["company", ""],
  ])
    assert.throws(() => validateQuote({ ...quote, [field]: value }), field);
});
test("search combines accent-insensitive matching and status filter", () => {
  const records = [
    { ...quote, number: 1048, status: "Recebido" },
    { ...quote, number: 1049, company: "Metalúrgica", status: "Concluído" },
  ];
  assert.equal(filterQuotes(records, "metalurgica", "")[0].number, 1049);
  assert.equal(filterQuotes(records, "SR-1048", "Recebido").length, 1);
  assert.equal(filterQuotes(records, "SR-1048", "Concluído").length, 0);
  assert.equal(reference({ number: 12 }), "SR-0012");
});
