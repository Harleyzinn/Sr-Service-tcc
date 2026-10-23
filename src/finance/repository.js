import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore/lite";
import { db } from "../firebase";
import { collections, validate, entryPayload } from "./domain";
import { incrementalLoader } from "./incremental-loader";
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
  const source = crypto.randomUUID();
  const channelName = `sr-finance:${db?.app.options.projectId || "unconfigured"}:${demo || "real"}:${user.id}`;
  const openChannel = () => {
    try {
      return typeof BroadcastChannel === "function"
        ? new BroadcastChannel(channelName)
        : null;
    } catch {
      return null;
    }
  };
  const announce = () => {
    const channel = openChannel();
    if (channel) {
      channel.postMessage({ source });
      channel.close();
    }
  };
  const ref = (kind, id) => doc(db, "users", user.id, kind, id);
  const connected = () => {
    if (!demo && !navigator.onLine)
      throw new Error(
        "Sem conexão. Conecte-se para consultar ou gravar no Firestore. Nenhuma gravação foi confirmada.",
      );
  };
  const loader = incrementalLoader(
    collections,
    async (kind, { since, after, size }) => {
      const constraints = [orderBy("updated_at"), limit(size)];
      if (since) constraints.push(where("updated_at", ">=", since));
      if (after) constraints.push(startAfter(after));
      const snapshot = await getDocs(
        query(collection(db, "users", user.id, kind), ...constraints),
      );
      return {
        rows: snapshot.docs.map(normalize),
        after: snapshot.docs.at(-1),
        watermark: snapshot.docs.at(-1)?.data().updated_at,
      };
    },
  );
  return {
    subscribeChanges(listener) {
      const channel = openChannel();
      if (channel)
        channel.onmessage = (event) => {
          if (event.data?.source && event.data.source !== source) listener();
        };
      const storage = (event) => {
        if (demo && event.key === key) listener();
      };
      if (!channel) window.addEventListener("storage", storage);
      return () => {
        channel?.close();
        window.removeEventListener("storage", storage);
      };
    },
    getReadMetrics: loader.getReadMetrics,
    async load(options) {
      connected();
      if (demo) return localRead(key);
      return loader.load(options);
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
        announce();
        return value;
      }
      const result = await runTransaction(db, async (tx) => {
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
      announce();
      return result;
    },
    async createEntries(rows, accounts) {
      connected();
      if (
        !Array.isArray(rows) ||
        rows.length < 1 ||
        rows.length > 100 ||
        rows.some(
          (r) =>
            typeof r.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(r.id),
        ) ||
        new Set(rows.map((r) => r.id)).size !== rows.length
      )
        throw new Error(
          "A operação deve conter entre 1 e 100 lançamentos com identificadores únicos.",
        );
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
        announce();
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
      announce();
    },
  };
}
