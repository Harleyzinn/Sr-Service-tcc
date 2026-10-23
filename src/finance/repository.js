import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore/lite";
import { db } from "../firebase";
import { collections, validate, entryPayload } from "./domain";
const allowed = {
  accounts: ["name", "type", "opening_cents"],
  entries: [
    "kind",
    "description",
    "category",
    "account_id",
    "to_account_id",
    "amount_cents",
    "date",
    "status",
    "series_id",
  ],
  series: [
    "kind",
    "description",
    "category",
    "account_id",
    "amount_cents",
    "start_date",
    "end_date",
    "frequency",
    "active",
  ],
  budgets: ["month", "category", "limit_cents"],
  goals: ["name", "target_cents", "saved_cents"],
};
const clean = (kind, value) =>
  Object.fromEntries(allowed[kind].map((key) => [key, value[key]]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function localKey(user, demo) {
  return `sr-finance-v1:${demo}:${user.id}`;
}
function localRead(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return Object.fromEntries(collections.map((k) => [k, []]));
  const data = JSON.parse(raw);
  if (!collections.every((k) => Array.isArray(data[k])))
    throw new Error(
      "Dados locais inválidos. Exporte e verifique o armazenamento antes de continuar.",
    );
  return data;
}
const normalize = (s) => ({
  ...s.data(),
  id: s.id,
  created_at: s.data().created_at?.toDate?.().toISOString() || null,
  updated_at: s.data().updated_at?.toDate?.().toISOString() || null,
});
export function financeRepository(user, demo) {
  const key = localKey(user, demo);
  const ref = (kind, id) => doc(db, "users", user.id, kind, id);
  const connected = () => {
    if (!demo && !navigator.onLine)
      throw new Error(
        "Sem conexão. Conecte-se para consultar ou gravar no Firestore. Nenhuma gravação foi confirmada.",
      );
  };
  return {
    async load() {
      connected();
      if (demo) return localRead(key);
      const result = {};
      await Promise.all(
        collections.map(async (kind) => {
          const rows = [];
          let cursor = null;
          while (true) {
            const constraints = [orderBy("__name__"), limit(250)];
            if (cursor) constraints.push(startAfter(cursor));
            const snapshot = await getDocs(
              query(collection(db, "users", user.id, kind), ...constraints),
            );
            rows.push(...snapshot.docs.map(normalize));
            if (rows.length > 10000)
              throw new Error(
                "A coleção excede 10 mil registros. Use uma exportação administrativa e consolidação antes de calcular totais neste módulo.",
              );
            if (snapshot.size < 250) break;
            cursor = snapshot.docs.at(-1);
          }
          result[kind] = rows;
        }),
      );
      return result;
    },
    async save(kind, id, values, expected = 0, accounts = []) {
      connected();
      const payload = clean(kind, values);
      validate(kind, payload, accounts);
      if (demo) {
        const data = localRead(key);
        const previous = data[kind].find((row) => row.id === id);
        if (previous && expected === 0) {
          if (same(clean(kind, previous), payload)) return previous;
          throw new Error("Esta operação já foi utilizada. Atualize a tela.");
        }
        if (previous && previous.version !== expected)
          throw new Error(
            "Outro acesso alterou este registro. Atualize antes de salvar novamente.",
          );
        if (!previous && expected !== 0)
          throw new Error("Registro não encontrado.");
        const value = {
          ...payload,
          id,
          version: (previous?.version || 0) + 1,
          created_at: previous?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        data[kind] = [value, ...data[kind].filter((row) => row.id !== id)];
        localStorage.setItem(key, JSON.stringify(data));
        return value;
      }
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref(kind, id));
        const previous = snapshot.exists() ? snapshot.data() : null;
        if (previous && expected === 0) {
          if (same(clean(kind, previous), payload)) return { id, ...previous };
          throw new Error("Esta operação já foi utilizada. Atualize a tela.");
        }
        if (previous && previous.version !== expected)
          throw new Error(
            "Outro acesso alterou este registro. Atualize antes de salvar novamente.",
          );
        if (!previous && expected !== 0)
          throw new Error("Registro não encontrado.");
        const value = {
          ...payload,
          version: (previous?.version || 0) + 1,
          created_at: previous?.created_at || serverTimestamp(),
          updated_at: serverTimestamp(),
        };
        tx.set(ref(kind, id), value);
        return { id, ...value };
      });
    },
    async createEntries(rows, accounts) {
      connected();
      rows.forEach((e) => validate("entries", entryPayload(e), accounts));
      if (demo) {
        const data = localRead(key);
        for (const row of rows) {
          const existing = data.entries.find((e) => e.id === row.id);
          if (existing && !same(clean("entries", existing), entryPayload(row)))
            throw new Error(
              "Uma parcela ou ocorrência já foi registrada com outros dados. Atualize a tela.",
            );
        }
        for (const row of rows)
          if (!data.entries.some((e) => e.id === row.id))
            data.entries.push({
              ...entryPayload(row),
              id: row.id,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        localStorage.setItem(key, JSON.stringify(data));
        return;
      }
      await runTransaction(db, async (tx) => {
        const snapshots = await Promise.all(
          rows.map((row) => tx.get(ref("entries", row.id))),
        );
        snapshots.forEach((s, i) => {
          if (
            s.exists() &&
            !same(clean("entries", s.data()), entryPayload(rows[i]))
          )
            throw new Error(
              "Uma parcela ou ocorrência já foi registrada com outros dados. Atualize a tela.",
            );
        });
        snapshots.forEach((s, i) => {
          if (!s.exists())
            tx.set(ref("entries", rows[i].id), {
              ...entryPayload(rows[i]),
              version: 1,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
        });
      });
    },
  };
}
