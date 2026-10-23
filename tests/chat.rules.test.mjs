import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
test("chat authorizes only the customer and verified admins and enforces atomic immutable messages", async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-sr-service",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  try {
    const client = env
      .authenticatedContext("chat-client", { email_verified: true })
      .firestore();
    const stranger = env
      .authenticatedContext("stranger", { email_verified: true })
      .firestore();
    const staff = env
      .authenticatedContext("chat-admin", { email_verified: true, admin: true })
      .firestore();
    const unverified = env
      .authenticatedContext("chat-client", { email_verified: false })
      .firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const room = (db) => doc(db, "conversations", "chat-client");
    const message = (db, id) => doc(room(db), "messages", id);
    const create = (db, id, sender, role, text, count, initial = false) => {
      const batch = writeBatch(db);
      const fields = {
        updated_at: serverTimestamp(),
        last_message_id: id,
        last_text: text,
        last_sender_id: sender,
        last_sender_role: role,
        message_count: count,
      };
      if (initial)
        batch.set(room(db), {
          customer_id: "chat-client",
          customer_name: "Cliente Teste",
          customer_company: "Empresa",
          created_at: serverTimestamp(),
          ...fields,
        });
      else batch.update(room(db), fields);
      batch.set(message(db, id), {
        sender_id: sender,
        sender_role: role,
        text,
        created_at: serverTimestamp(),
      });
      return batch.commit();
    };
    await assertSucceeds(getDoc(room(client)));
    await assertFails(
      create(
        stranger,
        "stolen",
        "stranger",
        "customer",
        "Não autorizado",
        1,
        true,
      ),
    );
    await assertFails(
      create(
        unverified,
        "unverified",
        "chat-client",
        "customer",
        "Não confirmado",
        1,
        true,
      ),
    );
    await assertFails(
      create(client, "spoof", "chat-client", "admin", "Admin falso", 1, true),
    );
    await assertFails(
      create(client, "blank", "chat-client", "customer", " \n\t ", 1, true),
    );
    await assertFails(
      create(
        client,
        "oversized",
        "chat-client",
        "customer",
        "x".repeat(4001),
        1,
        true,
      ),
    );
    await assertSucceeds(
      create(
        client,
        "first",
        "chat-client",
        "customer",
        "Olá\nPreciso de ajuda.",
        1,
        true,
      ),
    );
    await assertSucceeds(getDoc(room(staff)));
    await assertSucceeds(getDocs(collection(room(client), "messages")));
    await assertSucceeds(getDocs(collection(staff, "conversations")));
    for (const db of [stranger, unverified, anonymous]) {
      await assertFails(getDoc(room(db)));
      await assertFails(getDocs(collection(room(db), "messages")));
    }
    await assertFails(getDocs(collection(client, "conversations")));
    await assertFails(
      setDoc(message(client, "orphan"), {
        sender_id: "chat-client",
        sender_role: "customer",
        text: "Mensagem sem resumo",
        created_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(room(client), {
        last_text: "Resumo sem mensagem",
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(
      create(client, "impersonation", "chat-admin", "admin", "Falso", 2),
    );
    await assertFails(
      create(
        client,
        "bad-count",
        "chat-client",
        "customer",
        "Contagem inválida",
        100,
      ),
    );
    await assertSucceeds(
      create(staff, "reply", "chat-admin", "admin", "Olá, vamos ajudar.", 2),
    );
    await assertFails(
      updateDoc(message(staff, "first"), { text: "Texto reescrito" }),
    );
    await assertFails(deleteDoc(message(staff, "first")));
    await assertFails(deleteDoc(room(staff)));
    await assertFails(
      updateDoc(room(staff), {
        customer_id: "stranger",
        updated_at: serverTimestamp(),
      }),
    );
    assert.equal((await getDoc(room(client))).data().message_count, 2);
    assert.equal(
      (await getDoc(message(client, "reply"))).data().sender_role,
      "admin",
    );
  } finally {
    await env.cleanup();
  }
});
