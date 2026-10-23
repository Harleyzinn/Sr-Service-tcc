import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import { db } from "./firebase";

const iso = (value) => (value?.toDate ? value.toDate().toISOString() : value);
const stamp = (value) =>
  value?.seconds != null ? `${value.seconds}:${value.nanoseconds}` : value;
export function normalizeQuote(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    revision: stamp(data.updated_at || data.created_at),
    created_at: iso(data.created_at),
    updated_at: iso(data.updated_at),
    events: Object.entries(data.events || {}).map(([id, event]) => ({
      ...event,
      id,
      created_at: iso(event.created_at),
    })),
  };
}
export async function ensureProfile(user, fields = {}) {
  const ref = doc(db, "profiles", user.id || user.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      if (Object.keys(fields).length) transaction.update(ref, fields);
      return { ...snapshot.data(), ...fields, id: ref.id };
    }
    const legacy = await transaction.get(
      doc(db, "usuarios", user.id || user.uid),
    );
    const previous = legacy.exists() ? legacy.data() : {};
    const profile = {
      full_name: previous.NOME_USU || user.displayName || "",
      company: "",
      phone: previous.TEL_USU || "",
      document: previous.CPF_CNPJ_USU || "",
      address: previous.END_USU || "",
      ...fields,
      email: user.email,
      created_at: serverTimestamp(),
    };
    transaction.set(ref, profile);
    return { ...profile, id: ref.id };
  });
}
export async function listQuotes(user, admin) {
  const constraints = admin ? [] : [where("user_id", "==", user.id)];
  const snapshot = await getDocs(
    query(
      collection(db, "quotes"),
      ...constraints,
      orderBy("created_at", "desc"),
    ),
  );
  return snapshot.docs.map(normalizeQuote);
}
export async function getQuote(id) {
  const snapshot = await getDoc(doc(db, "quotes", id));
  return snapshot.exists() ? normalizeQuote(snapshot) : null;
}
export async function createQuote(user, payload, operationId) {
  const ref = operationId
    ? doc(db, "quotes", operationId)
    : doc(collection(db, "quotes"));
  // Firestore's unique document ID is also the reference, avoiding a writable global counter.
  const quote = {
    ...payload,
    number: ref.id,
    user_id: user.id,
    status: "Recebido",
    amount: null,
    notes: "",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    last_event_id: "received",
    events: { received: { status: "Recebido", created_at: serverTimestamp() } },
  };
  try {
    await setDoc(ref, quote);
  } catch (error) {
    try {
      const existing = await getDoc(ref);
      if (
        existing.exists() &&
        existing.data().user_id === user.id &&
        Object.entries(payload).every(
          ([key, value]) => existing.data()[key] === value,
        )
      )
        return { id: ref.id, ...existing.data() };
    } catch {
      /* keep original write error */
    }
    throw error;
  }
  return { ...quote, id: ref.id };
}
export async function updateQuote(id, payload, expectedRevision) {
  const ref = doc(db, "quotes", id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Orçamento não encontrado.");
    const previous = snapshot.data();
    if (
      expectedRevision &&
      stamp(previous.updated_at || previous.created_at) !== expectedRevision
    )
      throw new Error(
        "Outro acesso atualizou este orçamento. Recarregue os dados antes de salvar suas alterações.",
      );
    const changes = {
      status: payload.status,
      amount: payload.amount,
      notes: payload.notes,
      updated_at: serverTimestamp(),
    };
    if (previous.status !== payload.status) {
      const eventId = crypto.randomUUID();
      changes.last_event_id = eventId;
      changes[`events.${eventId}`] = {
        status: payload.status,
        created_at: serverTimestamp(),
      };
    }
    transaction.update(ref, changes);
  });
}
