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
  getDoc,
  getDocs,
  query,
  where,
  collection,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

test("production legacy records retain owner isolation and trusted administrator status updates", async () => {
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
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "usuarios", "owner"), {
        uid: "owner",
        admin: false,
        NOME_USU: "Existing Customer",
      });
      await setDoc(doc(db, "usuarios", "legacy-admin"), {
        uid: "legacy-admin",
        admin: true,
      });
      await setDoc(doc(db, "orcamentos", "old-order"), {
        userUid: "owner",
        STATUS_ORCAMENTO: "Não Visualizado",
        DESCRICAO: "Original production description",
      });
    });
    const owner = env
      .authenticatedContext("owner", {
        email: "owner@example.com",
        email_verified: true,
      })
      .firestore();
    const stranger = env
      .authenticatedContext("stranger", { email_verified: true })
      .firestore();
    const admin = env
      .authenticatedContext("new-admin", { email_verified: true, admin: true })
      .firestore();
    const legacyAdmin = env.authenticatedContext("legacy-admin").firestore();
    await assertSucceeds(getDoc(doc(owner, "usuarios", "owner")));
    assert.equal(
      (
        await assertSucceeds(getDoc(doc(stranger, "usuarios", "stranger")))
      ).exists(),
      false,
    );
    await assertFails(getDoc(doc(stranger, "usuarios", "owner")));
    assert.equal(
      (
        await assertSucceeds(
          getDocs(
            query(
              collection(owner, "orcamentos"),
              where("userUid", "==", "owner"),
            ),
          ),
        )
      ).size,
      1,
    );
    await assertFails(getDoc(doc(stranger, "orcamentos", "old-order")));
    await assertFails(getDocs(collection(owner, "orcamentos")));
    await assertSucceeds(getDocs(collection(admin, "orcamentos")));
    await assertSucceeds(getDoc(doc(legacyAdmin, "orcamentos", "old-order")));
    await assertSucceeds(
      updateDoc(doc(admin, "orcamentos", "old-order"), {
        STATUS_ORCAMENTO: "Em Análise",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(owner, "orcamentos", "old-order"), {
        STATUS_ORCAMENTO: "Aprovado",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(admin, "orcamentos", "old-order"), {
        DESCRICAO: "Changed original",
      }),
    );
    await assertFails(
      updateDoc(doc(owner, "usuarios", "owner"), { admin: true }),
    );
    await assertFails(deleteDoc(doc(admin, "orcamentos", "old-order")));
    assert.equal(
      (await getDoc(doc(owner, "orcamentos", "old-order"))).data().DESCRICAO,
      "Original production description",
    );
  } finally {
    await env.cleanup();
  }
});
