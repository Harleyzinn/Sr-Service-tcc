import test from "node:test";
import assert from "node:assert/strict";
import { messageText, sameMessage } from "../src/chat/domain.js";
test("chat validates message text without evaluating or replacing its content", () => {
  assert.equal(
    messageText("  Olá\nPreciso de ajuda.  "),
    "Olá\nPreciso de ajuda.",
  );
  assert.equal(
    messageText('<script>alert("teste")</script>'),
    '<script>alert("teste")</script>',
  );
  for (const value of [null, "", "  \n\t ", "a".repeat(4001)])
    assert.throws(() => messageText(value));
  assert.equal(messageText("a".repeat(4000)).length, 4000);
});
test("chat retry identity requires matching sender, role and message content", () => {
  const message = {
    text: "Ajuda",
    sender_id: "client",
    sender_role: "customer",
  };
  assert.ok(sameMessage(message, "Ajuda", "client", "customer"));
  assert.equal(sameMessage(message, "Alterada", "client", "customer"), false);
  assert.equal(sameMessage(message, "Ajuda", "other", "customer"), false);
  assert.equal(sameMessage(message, "Ajuda", "client", "admin"), false);
});
