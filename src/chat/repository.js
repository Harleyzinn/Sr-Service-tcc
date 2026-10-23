import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  getDocFromServer,
} from "firebase/firestore";
import { chatDb } from "./firebase";
import { messageText, sameMessage } from "./domain.js";
const DEMO_KEY = "sr-chat-demo-v1";
const normalize = (snapshot) => {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    created_at: data.created_at?.toDate?.().toISOString() || null,
    updated_at: data.updated_at?.toDate?.().toISOString() || null,
  };
};
function localRead() {
  const raw = localStorage.getItem(DEMO_KEY);
  if (!raw) return { rooms: {}, messages: {} };
  const data = JSON.parse(raw);
  if (!data.rooms || !data.messages)
    throw new Error("Não foi possível ler as conversas da demonstração.");
  return data;
}
export function chatRepository(user, profile, admin, demo) {
  const role = admin ? "admin" : "customer";
  const roomRef = (uid) => doc(chatDb, "conversations", uid);
  const access = (uid) => {
    if (!admin && uid !== user.id)
      throw new Error("Você não tem acesso a esta conversa.");
  };
  const observeLocal = (read, receive, fail) => {
    const update = () => {
      try {
        receive(read(localRead()), { cached: false });
      } catch (e) {
        fail(e);
      }
    };
    const storage = (event) => {
      if (event.key === DEMO_KEY) update();
    };
    update();
    window.addEventListener("storage", storage);
    window.addEventListener("sr-chat-demo-change", update);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("sr-chat-demo-change", update);
    };
  };
  return {
    watchInbox(count, receive, fail) {
      if (!admin)
        throw new Error("A caixa de atendimento é exclusiva da equipe.");
      if (demo)
        return observeLocal(
          (data) => {
            const rows = Object.values(data.rooms).sort(
              (a, b) =>
                b.updated_at.localeCompare(a.updated_at) ||
                a.id.localeCompare(b.id),
            );
            return { rows: rows.slice(0, count), more: rows.length > count };
          },
          receive,
          fail,
        );
      return onSnapshot(
        query(
          collection(chatDb, "conversations"),
          orderBy("updated_at", "desc"),
          limit(count + 1),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          receive(
            {
              rows: snapshot.docs.slice(0, count).map(normalize),
              more: snapshot.size > count,
            },
            { cached: snapshot.metadata.fromCache },
          );
        },
        fail,
      );
    },
    watchRoom(uid, receive, fail) {
      access(uid);
      if (demo)
        return observeLocal((data) => data.rooms[uid] || null, receive, fail);
      return onSnapshot(
        roomRef(uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          receive(snapshot.exists() ? normalize(snapshot) : null, {
            cached: snapshot.metadata.fromCache,
          });
        },
        fail,
      );
    },
    watchMessages(uid, count, receive, fail) {
      access(uid);
      if (demo)
        return observeLocal(
          (data) => {
            const rows = [...(data.messages[uid] || [])].sort(
              (a, b) =>
                b.created_at.localeCompare(a.created_at) ||
                b.id.localeCompare(a.id),
            );
            return {
              rows: rows.slice(0, count).reverse(),
              more: rows.length > count,
            };
          },
          receive,
          fail,
        );
      return onSnapshot(
        query(
          collection(chatDb, "conversations", uid, "messages"),
          orderBy("created_at", "desc"),
          limit(count + 1),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          receive(
            {
              rows: snapshot.docs.slice(0, count).map(normalize).reverse(),
              more: snapshot.size > count,
            },
            { cached: snapshot.metadata.fromCache },
          );
        },
        fail,
      );
    },
    async send(uid, id, input) {
      access(uid);
      const text = messageText(input);
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id))
        throw new Error("Identificador de envio inválido.");
      if (!demo && !navigator.onLine)
        throw new Error(
          "Sem conexão. Sua mensagem não foi enviada. Reconecte-se para tentar novamente.",
        );
      const customerName =
        (profile?.full_name || user.displayName || "Cliente")
          .trim()
          .slice(0, 120) || "Cliente";
      const company = (profile?.company || "").trim().slice(0, 160);
      const message = { sender_id: user.id, sender_role: role, text };
      if (demo) {
        const data = localRead();
        const previous = data.rooms[uid];
        const existing = (data.messages[uid] || []).find((m) => m.id === id);
        if (existing) {
          if (sameMessage(existing, text, user.id, role)) return;
          throw new Error(
            "Este envio já foi registrado com outro conteúdo. Abra a conversa novamente.",
          );
        }
        if (!previous && admin)
          throw new Error(
            "O cliente precisa iniciar a conversa antes da resposta da equipe.",
          );
        const now = new Date().toISOString();
        data.rooms[uid] = {
          ...(previous || {
            id: uid,
            customer_id: uid,
            customer_name: customerName,
            customer_company: company,
            created_at: now,
          }),
          updated_at: now,
          last_message_id: id,
          last_text: text,
          last_sender_id: user.id,
          last_sender_role: role,
          message_count: (previous?.message_count || 0) + 1,
        };
        data.messages[uid] = [
          ...(data.messages[uid] || []),
          { ...message, id, created_at: now },
        ];
        localStorage.setItem(DEMO_KEY, JSON.stringify(data));
        window.dispatchEvent(new Event("sr-chat-demo-change"));
        return;
      }
      const ref = roomRef(uid);
      const messageRef = doc(ref, "messages", id);
      for (let attempt = 0; attempt < 4; attempt++) {
        let observedLast = null;
        try {
          await runTransaction(chatDb, async (tx) => {
            const room = await tx.get(ref);
            observedLast = room.exists() ? room.data().last_message_id : null;
            const saved = await tx.get(messageRef);
            if (saved.exists()) {
              if (sameMessage(saved.data(), text, user.id, role)) return;
              throw new Error(
                "Este envio já foi registrado com outro conteúdo. Abra a conversa novamente.",
              );
            }
            if (!room.exists() && admin)
              throw new Error(
                "O cliente precisa iniciar a conversa antes da resposta da equipe.",
              );
            const update = {
              updated_at: serverTimestamp(),
              last_message_id: id,
              last_text: text,
              last_sender_id: user.id,
              last_sender_role: role,
              message_count: room.exists() ? increment(1) : 1,
            };
            if (room.exists()) tx.update(ref, update);
            else
              tx.set(ref, {
                customer_id: uid,
                customer_name: customerName,
                customer_company: company,
                created_at: serverTimestamp(),
                ...update,
              });
            tx.set(messageRef, { ...message, created_at: serverTimestamp() });
          });
          return;
        } catch (error) {
          // Rules can reject a stale first-create before the transaction conflict is returned.
          // Retry only after an authorized server read proves another message advanced the room.
          if (error.code === "permission-denied" && attempt < 3) {
            let latest;
            try {
              latest = await getDocFromServer(ref);
            } catch {
              throw error;
            }
            if (
              latest.exists() &&
              latest.data().last_message_id !== observedLast
            )
              continue;
          }
          throw error;
        }
      }
    },
  };
}
