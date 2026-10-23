import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import { db } from "./firebase";

const iso = (value) => (value?.toDate ? value.toDate().toISOString() : value);
export function normalizeQuote(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
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
    const profile = {
      full_name: user.displayName || "",
      company: "",
      phone: "",
      document: "",
      address: "",
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
export async function createQuote(user, payload) {
  const ref = doc(collection(db, "quotes"));
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
  await setDoc(ref, quote);
  return { ...quote, id: ref.id };
}
export async function updateQuote(id, payload) {
  const ref = doc(db, "quotes", id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Orçamento não encontrado.");
    const previous = snapshot.data();
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
