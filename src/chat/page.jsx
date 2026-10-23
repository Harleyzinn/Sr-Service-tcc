import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { friendly } from "../api";
import { useOnline } from "../network";
import { ErrorBox, Icon, PageHeading } from "../ui";
import { chatRepository } from "./repository";
import { MESSAGE_LIMIT } from "./domain";
import "./styles.css";
const empty = { rows: [], more: false };
const time = (value) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "";
function useLive(subscribe, initial) {
  const [state, setState] = useState({
    value: initial,
    loading: true,
    error: "",
    connection: "connecting",
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState((s) => ({
      ...s,
      loading: true,
      error: "",
      connection: "connecting",
    }));
    const fail = (e) => {
      if (active)
        setState({
          value: initial,
          loading: false,
          error: friendly(e),
          connection: "error",
        });
    };
    let stop;
    try {
      stop = subscribe((value, { cached }) => {
        if (!active) return;
        if (cached) setState((s) => ({ ...s, connection: "connecting" }));
        else setState({ value, loading: false, error: "", connection: "live" });
      }, fail);
    } catch (e) {
      fail(e);
    }
    return () => {
      active = false;
      stop?.();
    };
  }, [subscribe, initial, revision]);
  return { ...state, retry: () => setRevision((n) => n + 1) };
}
function Inbox({ repo, selected, onSelect }) {
  const [count, setCount] = useState(25);
  const subscribe = useCallback(
    (next, fail) => repo.watchInbox(count, next, fail),
    [repo, count],
  );
  const inbox = useLive(subscribe, empty);
  return (
    <aside className="chat-inbox panel" aria-label="Conversas de clientes">
      <div className="chat-inbox-heading">
        <h2>Atendimentos</h2>
        <span>Mais recentes primeiro</span>
      </div>
      <ErrorBox>{inbox.error}</ErrorBox>
      {inbox.error && (
        <button className="text-link" onClick={inbox.retry}>
          Tentar carregar conversas
        </button>
      )}
      {inbox.loading && !inbox.value.rows.length ? (
        <p className="chat-empty">Carregando conversas…</p>
      ) : !inbox.error && !inbox.value.rows.length ? (
        <div className="chat-empty">
          <Icon name="MessagesSquare" size={28} />
          <p>Nenhum cliente iniciou uma conversa ainda.</p>
        </div>
      ) : (
        <div className="chat-inbox-list">
          {inbox.value.rows.map((room) => (
            <button
              key={room.id}
              className={selected === room.id ? "selected" : ""}
              aria-pressed={selected === room.id}
              onClick={() => onSelect(room.id)}
            >
              <div>
                <strong>{room.customer_name}</strong>
                <time dateTime={room.updated_at}>{time(room.updated_at)}</time>
              </div>
              {room.customer_company && <small>{room.customer_company}</small>}
              <p>
                <span>
                  {room.last_sender_role === "admin" ? "Equipe: " : "Cliente: "}
                </span>
                {room.last_text}
              </p>
            </button>
          ))}
        </div>
      )}
      {inbox.value.more && (
        <button
          className="chat-more text-link"
          disabled={inbox.loading}
          onClick={() => setCount((n) => n + 25)}
        >
          Carregar mais conversas
        </button>
      )}
    </aside>
  );
}
function Thread({ uid, repo, user, admin, demo }) {
  const online = useOnline();
  const [count, setCount] = useState(50);
  const subscribeRoom = useCallback(
    (next, fail) => repo.watchRoom(uid, next, fail),
    [repo, uid],
  );
  const subscribeMessages = useCallback(
    (next, fail) => repo.watchMessages(uid, count, next, fail),
    [repo, uid, count],
  );
  const room = useLive(subscribeRoom, null);
  const history = useLive(subscribeMessages, empty);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newBelow, setNewBelow] = useState(false);
  const operation = useRef(null);
  const sending = useRef(false);
  const log = useRef(null);
  const nearBottom = useRef(true);
  const before = useRef({ height: 0, last: null });
  const input = useRef(null);
  const rows = history.value.rows;
  useLayoutEffect(() => {
    const el = log.current;
    if (!el) return;
    const last = rows.at(-1)?.id;
    if (nearBottom.current || !before.current.height)
      el.scrollTop = el.scrollHeight;
    else if (last === before.current.last)
      el.scrollTop += el.scrollHeight - before.current.height;
    else setNewBelow(true);
    before.current = { height: el.scrollHeight, last };
  }, [rows]);
  const connected =
    demo ||
    (online && room.connection === "live" && history.connection === "live");
  const canSend =
    connected &&
    !busy &&
    !room.loading &&
    !history.loading &&
    !room.error &&
    !history.error &&
    (!admin || room.value);
  async function send(event) {
    event?.preventDefault();
    if (sending.current || !canSend || !text.trim()) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const body = text.trim();
    if (!operation.current || operation.current.text !== body)
      operation.current = { id: crypto.randomUUID(), text: body };
    try {
      nearBottom.current = true;
      await repo.send(uid, operation.current.id, body);
      setText("");
      operation.current = null;
      input.current?.focus();
    } catch (e) {
      setError(friendly(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const title = admin
    ? room.value?.customer_name || "Conversa do cliente"
    : "Equipe SR Service";
  return (
    <section className="chat-thread panel" aria-label="Atendimento por chat">
      <header className="chat-thread-heading">
        <span className="chat-avatar">
          <Icon name={admin ? "UserRound" : "MessagesSquare"} size={23} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>
            {admin
              ? room.value?.customer_company || "Atendimento ao cliente"
              : "Envie sua dúvida e acompanhe a resposta por aqui."}
          </p>
        </div>
      </header>
      <div className="chat-connection" role="status">
        <Icon name={connected ? "ShieldCheck" : "RefreshCw"} size={14} />
        {demo
          ? "Demonstração · mensagens salvas neste navegador"
          : connected
            ? "Conectado · histórico salvo no Firebase"
            : !online
              ? "Sem conexão · novos envios estão pausados"
              : "Conectando ao atendimento…"}
      </div>
      {(room.error || history.error) && (
        <div className="chat-load-error">
          <ErrorBox>{room.error || history.error}</ErrorBox>
          <button
            className="text-link"
            onClick={() => {
              room.retry();
              history.retry();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <div
        className="chat-log"
        ref={log}
        role="log"
        aria-label="Mensagens da conversa"
        aria-live={history.loading ? "off" : "polite"}
        aria-relevant="additions"
        onScroll={() => {
          const el = log.current;
          nearBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (nearBottom.current) setNewBelow(false);
        }}
      >
        {history.value.more && (
          <button
            className="chat-more text-link"
            disabled={history.loading}
            onClick={() => setCount((n) => n + 50)}
          >
            {history.loading ? "Carregando…" : "Carregar mensagens anteriores"}
          </button>
        )}
        {history.loading && !rows.length ? (
          <p className="chat-empty">Consultando histórico…</p>
        ) : !room.error && !history.error && !rows.length ? (
          <div className="chat-empty">
            <Icon name="MessagesSquare" size={35} />
            <h3>
              {admin ? "Conversa não encontrada" : "Como podemos ajudar?"}
            </h3>
            <p>
              {admin
                ? "Selecione um atendimento iniciado por um cliente."
                : "Escreva sua primeira mensagem. A conversa ficará disponível na sua conta."}
            </p>
          </div>
        ) : (
          rows.map((message) => (
            <article
              className={`chat-message ${message.sender_id === user.id ? "mine" : "theirs"}`}
              key={message.id}
            >
              <strong>
                {message.sender_role === "admin"
                  ? "Equipe SR Service"
                  : message.sender_id === user.id
                    ? "Você"
                    : room.value?.customer_name || "Cliente"}
              </strong>
              <p>{message.text}</p>
              <time dateTime={message.created_at}>
                {time(message.created_at)}
              </time>
            </article>
          ))
        )}
        {newBelow && (
          <button
            className="chat-new button secondary"
            onClick={() => {
              log.current.scrollTop = log.current.scrollHeight;
              nearBottom.current = true;
              setNewBelow(false);
            }}
          >
            Ir para novas mensagens <Icon name="ArrowDown" size={15} />
          </button>
        )}
      </div>
      <form className="chat-composer" onSubmit={send}>
        <ErrorBox>{error}</ErrorBox>
        <label htmlFor={`message-${uid}`}>Sua mensagem</label>
        <textarea
          id={`message-${uid}`}
          ref={input}
          rows={3}
          maxLength={MESSAGE_LIMIT}
          value={text}
          disabled={busy}
          placeholder={
            admin ? "Escreva para o cliente…" : "Escreva para a equipe…"
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
        />
        <div>
          <span>
            {text.length}/{MESSAGE_LIMIT} · Ctrl + Enter para enviar
          </span>
          <button className="button" disabled={!canSend || !text.trim()}>
            {busy ? "Enviando…" : "Enviar mensagem"}
            <Icon
              name={busy ? "LoaderCircle" : "ArrowUpRight"}
              className={busy ? "spin" : ""}
              size={17}
            />
          </button>
        </div>
        <small>
          As respostas ficam nesta conversa. O envio não garante atendimento
          imediato.
        </small>
      </form>
    </section>
  );
}
export default function Chat() {
  const { user, profile, admin, demo } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("conversa") || "";
  const selected = admin
    ? requested.length <= 128 && !requested.includes("/")
      ? requested
      : ""
    : user.id;
  const repo = useMemo(
    () => chatRepository(user, profile, admin, demo),
    [user.id, profile?.full_name, profile?.company, admin, demo],
  );
  return (
    <>
      <PageHeading
        eyebrow="ATENDIMENTO E HISTÓRICO"
        title={admin ? "Central de conversas" : "Chat com a equipe"}
        description={
          admin
            ? "Acompanhe e responda às mensagens dos clientes."
            : "Converse com os administradores e consulte suas mensagens quando precisar."
        }
      />
      <div className={`chat-layout ${admin ? "with-inbox" : ""}`}>
        {admin && (
          <Inbox
            repo={repo}
            selected={selected}
            onSelect={(id) => setParams({ conversa: id })}
          />
        )}
        {selected ? (
          <Thread
            key={`${user.id}:${demo}:${selected}`}
            uid={selected}
            repo={repo}
            user={user}
            admin={admin}
            demo={demo}
          />
        ) : (
          <section className="panel chat-select">
            <Icon name="MessagesSquare" size={42} />
            <h2>Selecione uma conversa</h2>
            <p>
              Os atendimentos iniciados pelos clientes aparecem na lista ao
              lado.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
