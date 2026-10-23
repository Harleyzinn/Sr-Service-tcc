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
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
test("Firestore isolates customers and enforces admin updates with append-only history", async () => {
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
    await env.clearFirestore();
    const alice = env
      .authenticatedContext("alice", {
        email: "alice@example.com",
        email_verified: true,
      })
      .firestore();
    const bob = env
      .authenticatedContext("bob", {
        email: "bob@example.com",
        email_verified: true,
      })
      .firestore();
    const admin = env
      .authenticatedContext("team", {
        email: "team@example.com",
        email_verified: true,
        admin: true,
      })
      .firestore();
    const unverified = env
      .authenticatedContext("pending", {
        email: "pending@example.com",
        email_verified: false,
      })
      .firestore();
    const anon = env.unauthenticatedContext().firestore();
    const profile = {
      full_name: "Alice Silva",
      company: "Empresa A",
      phone: "11999999999",
      document: "",
      address: "Rua Industrial, 1",
      email: "alice@example.com",
      created_at: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(alice, "profiles", "alice"), profile));
    await assertFails(
      setDoc(doc(bob, "profiles", "alice"), {
        ...profile,
        email: "bob@example.com",
      }),
    );
    await assertFails(
      updateDoc(doc(alice, "profiles", "alice"), { admin: true }),
    );
    await assertFails(
      updateDoc(doc(alice, "profiles", "alice"), {
        email: "outra@example.com",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(alice, "profiles", "alice"), { full_name: "Alice Souza" }),
    );
    await assertFails(getDoc(doc(bob, "profiles", "alice")));
    await assertSucceeds(getDoc(doc(admin, "profiles", "alice")));
    const payload = {
      number: "quote1",
      user_id: "alice",
      service: "Manutenção preventiva e corretiva",
      equipment: "Ponte rolante",
      description: "Avaliação técnica do motor e dos freios da ponte rolante.",
      urgency: "Planejado",
      company: "Empresa A",
      contact_name: "Alice Silva",
      email: "alice@example.com",
      phone: "11999999999",
      address: "Rua Industrial, 1",
      status: "Recebido",
      amount: null,
      notes: "",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      last_event_id: "received",
      events: {
        received: { status: "Recebido", created_at: serverTimestamp() },
      },
    };
    await assertSucceeds(setDoc(doc(alice, "quotes", "quote1"), payload));
    await assertFails(
      setDoc(doc(bob, "quotes", "quote2"), { ...payload, number: "quote2" }),
    );
    await assertFails(
      setDoc(doc(unverified, "quotes", "pending"), {
        ...payload,
        number: "pending",
        user_id: "pending",
      }),
    );
    await assertFails(
      setDoc(doc(alice, "quotes", "forged"), {
        ...payload,
        number: "forged",
        status: "Concluído",
      }),
    );
    await assertFails(getDoc(doc(bob, "quotes", "quote1")));
    await assertFails(getDoc(doc(anon, "quotes", "quote1")));
    await assertFails(getDocs(collection(alice, "quotes")));
    const own = await assertSucceeds(
      getDocs(
        query(
          collection(alice, "quotes"),
          where("user_id", "==", "alice"),
          orderBy("created_at", "desc"),
        ),
      ),
    );
    assert.equal(own.size, 1);
    await assertSucceeds(getDocs(collection(admin, "quotes")));
    await assertFails(
      updateDoc(doc(alice, "quotes", "quote1"), {
        status: "Concluído",
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "quotes", "quote1"), {
        status: "Proposta enviada",
        updated_at: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(admin, "quotes", "quote1"), {
        status: "Proposta enviada",
        amount: 8500,
        notes: "Proposta",
        updated_at: serverTimestamp(),
        last_event_id: "event2",
        "events.event2": {
          status: "Proposta enviada",
          created_at: serverTimestamp(),
        },
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "quotes", "quote1"), {
        "events.received.status": "Concluído",
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "quotes", "quote1"), {
        "events.fake": { status: "Concluído", created_at: serverTimestamp() },
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "quotes", "quote1"), {
        user_id: "bob",
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "quotes", "quote1"), {
        amount: -1,
        updated_at: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(admin, "quotes", "quote1"), {
        notes: "Condições atualizadas",
        updated_at: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(admin, "quotes", "quote1")));
    const saved = await getDoc(doc(alice, "quotes", "quote1"));
    assert.equal(saved.data().amount, 8500);
    assert.equal(Object.keys(saved.data().events).length, 2);
  } finally {
    await env.cleanup();
  }
});
