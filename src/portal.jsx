import { useCallback, useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "./auth";
import { api, friendly } from "./api";
import { Workflow, QuoteProgress } from "./workflow";
import { draftKey, readDraft, saveDraft, clearDraft } from "./draft";
import { changePassword } from "./firebase-auth";
import {
  date,
  sortQuotes,
  quotesCsv,
  filterQuotes,
  money,
  reference,
  services,
  statuses,
  validateProfile,
  validateQuote,
  validateTechnical,
} from "./domain";
import {
  Badge,
  ButtonLink,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Modal,
  PageHeading,
  SelectField,
  SuccessBox,
  useToast,
} from "./ui";
function useQuotes() {
  const { user, demo, admin } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .quotes(user, demo, admin)
      .then((q) => {
        if (active) setQuotes(q);
      })
      .catch((e) => {
        if (active) setError(friendly(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, demo, admin, revision]);
  return { quotes, loading, error, refresh };
}
function Retry({ error, refresh }) {
  return error ? (
    <div>
      <ErrorBox>{error}</ErrorBox>
      <button className="button secondary" onClick={refresh}>
        Tentar novamente
      </button>
    </div>
  ) : null;
}
function useQuote(id) {
  const { user, demo, admin } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .quote(user, demo, admin, id)
      .then((data) => {
        if (active) setQuote(data);
      })
      .catch((e) => {
        if (active) setError(friendly(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user.id, demo, admin, revision]);
  return { quote, loading, error, refresh };
}
function QuoteTable({ quotes, admin }) {
  return (
    <>
      <div className="table-scroll quote-desktop-table">
        <table className="quote-table">
          <thead>
            <tr>
              <th>ORÇAMENTO</th>
              <th>{admin ? "CLIENTE / EMPRESA" : "EQUIPAMENTO"}</th>
              <th>SOLICITADO EM</th>
              <th>STATUS</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link
                    to={`/app/orcamentos/${q.id}`}
                    className="quote-reference"
                  >
                    {reference(q)}
                  </Link>
                  <small>{q.service}</small>
                </td>
                <td>
                  <strong>{admin ? q.company : q.equipment}</strong>
                  <small>{admin ? q.contact_name : q.company}</small>
                </td>
                <td>{date(q.created_at)}</td>
                <td>
                  <Badge status={q.status} />
                </td>
                <td>
                  <Link
                    className="row-action"
                    to={`/app/orcamentos/${q.id}`}
                    aria-label={`Ver orçamento ${reference(q)}`}
                  >
                    <Icon name="ArrowUpRight" size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="quote-mobile-list">
        {quotes.map((q) => (
          <article className="quote-mobile-card" key={q.id}>
            <div className="mobile-quote-top">
              <Link className="quote-reference" to={"/app/orcamentos/" + q.id}>
                {reference(q)}
              </Link>
              <Badge status={q.status} />
            </div>
            <h3>{admin ? q.company : q.equipment}</h3>
            <p>{q.service}</p>
            <div className="mobile-quote-meta">
              <span>
                <Icon name="Clock3" size={13} />
                {date(q.created_at)}
              </span>
              <Link to={"/app/orcamentos/" + q.id}>
                Ver detalhes <Icon name="ArrowUpRight" size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export function Dashboard() {
  const { profile, admin } = useAuth();
  const { quotes, loading, error, refresh } = useQuotes();
  const active = quotes.filter(
    (q) => !["Concluído", "Cancelado"].includes(q.status),
  ).length;
  const proposals = quotes.filter(
    (q) => q.status === "Proposta enviada",
  ).length;
  const done = quotes.filter((q) => q.status === "Concluído").length;
  return (
    <>
      <PageHeading
        eyebrow={admin ? "CENTRAL DE OPERAÇÕES" : "SEU PORTAL SR SERVICE"}
        title={`Olá, ${profile?.full_name?.split(" ")[0] || "boas-vindas"} 👋`}
        description={
          admin
            ? "Tudo o que você precisa para acompanhar e organizar o atendimento."
            : "Acompanhe suas solicitações e mantenha sua operação em movimento."
        }
      >
        {!admin && (
          <ButtonLink to="/app/novo-orcamento">
            <Icon name="Plus" size={18} />
            Novo orçamento
          </ButtonLink>
        )}
      </PageHeading>
      <section className="portal-welcome">
        <div>
          <span className="welcome-tag">
            {admin
              ? "ATENDIMENTO COM VISÃO COMPLETA"
              : "SEMPRE AO LADO DA SUA INDÚSTRIA"}
          </span>
          <h2>
            {admin ? (
              <>
                Cada solicitação,
                <br />
                um próximo passo.
              </>
            ) : (
              <>
                Sua próxima solução
                <br />
                começa com uma conversa.
              </>
            )}
          </h2>
          <p>
            {admin
              ? "Analise os pedidos, prepare propostas e atualize seus clientes."
              : "Conte com a nossa expertise do diagnóstico à entrega."}
          </p>
          <Link to={admin ? "/app/orcamentos" : "/app/novo-orcamento"}>
            {admin ? "Gerenciar orçamentos" : "Solicitar um orçamento"}{" "}
            <Icon name="ArrowUpRight" size={18} />
          </Link>
        </div>
        <div className="welcome-graphic" aria-hidden="true">
          <div className="graphic-frame" />
          <span className="graphic-hook" />
          <span className="graphic-sr">
            SR<span>↗</span>
          </span>
          <small>PRECISÃO EM CADA MOVIMENTO.</small>
        </div>
      </section>
      <div className="stats-grid">
        {[
          [
            "Files",
            "Total de orçamentos",
            quotes.length,
            "Todas as suas solicitações",
          ],
          ["Clock3", "Em andamento", active, "Atendimentos em aberto"],
          [
            "FileText",
            "Propostas enviadas",
            proposals,
            "Disponíveis para consulta",
          ],
          ["CheckCircle2", "Concluídos", done, "Soluções entregues"],
        ].map(([icon, t, n, p]) => (
          <div className="stat-card" key={t}>
            <div>
              <span>{t}</span>
              <Icon name={icon} size={19} />
            </div>
            <strong>
              {loading || error ? "—" : String(n).padStart(2, "0")}
            </strong>
            <small>{p}</small>
          </div>
        ))}
      </div>
      {!loading && !error && <Workflow quotes={quotes} admin={admin} />}
      <div className="dashboard-grid">
        <section className="panel recent">
          <div className="panel-heading">
            <div>
              <h2>Orçamentos recentes</h2>
              <p>Os últimos movimentos do seu atendimento.</p>
            </div>
            <Link className="text-link" to="/app/orcamentos">
              Ver todos <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <Retry error={error} refresh={refresh} />
          ) : quotes.length ? (
            <QuoteTable quotes={quotes.slice(0, 4)} admin={admin} />
          ) : (
            <Empty />
          )}
        </section>
        <aside className="panel quick-access">
          <span className="small-eyebrow">À SUA DISPOSIÇÃO</span>
          <h2>Como podemos ajudar?</h2>
          {[
            [
              admin ? "/app/clientes" : "/app/novo-orcamento",
              admin ? "Building2" : "Plus",
              admin ? "Conhecer seus clientes" : "Solicitar um serviço",
              "O próximo passo da sua operação",
            ],
            [
              "/servicos",
              "Wrench",
              "Conhecer as soluções",
              "Expertise para sua indústria",
            ],
            [
              "/app/ajuda",
              "CircleHelp",
              "Central de ajuda",
              "Respostas para suas dúvidas",
            ],
          ].map(([to, icon, t, p]) => (
            <Link to={to} key={to}>
              <span className="quick-icon">
                <Icon name={icon} size={19} />
              </span>
              <div>
                <strong>{t}</strong>
                <small>{p}</small>
              </div>
              <Icon name="ChevronRight" size={15} />
            </Link>
          ))}
          <div className="quick-note">
            <Icon name="ShieldCheck" size={18} />
            <span>
              Transparência em cada etapa.
              <br />
              Conte com a SR Service.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Quotes() {
  const { admin } = useAuth();
  const { quotes, loading, error, refresh } = useQuotes();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const toast = useToast();
  const search = params.get("busca") || "";
  const status = params.get("status") || "";
  const service = params.get("servico") || "";
  const order = ["recentes", "antigos", "atualizados", "valor"].includes(
    params.get("ordem"),
  )
    ? params.get("ordem")
    : "recentes";
  const perPage = 8;
  const filtered = sortQuotes(
    filterQuotes(quotes, search, status).filter(
      (q) => !service || q.service === service,
    ),
    order,
  );
  const activeFilters = Boolean(search || status || service);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  function filter(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  }
  function reset() {
    setParams(order !== "recentes" ? { ordem: order } : {}, { replace: true });
    setPage(1);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([quotesCsv(filtered)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sr-service-orcamentos.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Exportação concluída com os resultados filtrados.");
  }
  return (
    <>
      <PageHeading
        eyebrow="SOLICITAÇÕES E ATENDIMENTO"
        title={admin ? "Todos os orçamentos" : "Meus orçamentos"}
        description="Cada solicitação, cada etapa. Tudo em um só lugar."
      >
        <button
          className="button secondary refresh-button"
          onClick={refresh}
          disabled={loading}
        >
          <Icon name="RefreshCw" size={16} className={loading ? "spin" : ""} />
          Atualizar
        </button>
        {!admin && (
          <ButtonLink to="/app/novo-orcamento">
            <Icon name="Plus" size={18} />
            Novo orçamento
          </ButtonLink>
        )}
      </PageHeading>
      <section className="panel">
        <div className="list-toolbar">
          <div className="list-toolbar-top">
            <div className="filter-tabs">
              {[
                ["", "Todos"],
                ["Em análise", "Em análise"],
                ["Concluído", "Concluídos"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={status === value ? "active" : ""}
                  aria-pressed={status === value}
                  onClick={() => filter("status", value)}
                >
                  {label}
                  {!value && <span>{quotes.length}</span>}
                </button>
              ))}
            </div>
            <button
              className="text-link export-button"
              onClick={download}
              disabled={loading || Boolean(error) || !filtered.length}
            >
              <Icon name="Download" size={15} />
              Exportar CSV
            </button>
          </div>
          <div className="list-filters enhanced-filters">
            <label className="search">
              <Icon name="Search" size={17} />
              <input
                aria-label="Buscar orçamento"
                placeholder="Referência, empresa ou equipamento…"
                value={search}
                onChange={(e) => filter("busca", e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">Todos os status</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar por serviço"
              value={service}
              onChange={(e) => filter("servico", e.target.value)}
            >
              <option value="">Todos os serviços</option>
              {services.map((s) => (
                <option key={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="results-toolbar">
            <span aria-live="polite">
              {loading
                ? "Consultando solicitações…"
                : filtered.length +
                  " resultado" +
                  (filtered.length !== 1 ? "s" : "")}
              {activeFilters && (
                <button className="clear-filters" onClick={reset}>
                  Limpar filtros <Icon name="X" size={12} />
                </button>
              )}
            </span>
            <label>
              Ordenar por{" "}
              <select
                aria-label="Ordenar orçamentos"
                value={order}
                onChange={(e) => filter("ordem", e.target.value)}
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="atualizados">Última atualização</option>
                <option value="valor">Maior valor</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Retry error={error} refresh={refresh} />
        ) : filtered.length ? (
          <>
            <QuoteTable
              quotes={filtered.slice(
                (currentPage - 1) * perPage,
                currentPage * perPage,
              )}
              admin={admin}
            />
            <div className="table-footer">
              <span>
                Mostrando {(currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, filtered.length)} de{" "}
                {filtered.length}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Página anterior"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <Icon name="ArrowLeft" size={16} />
                </button>
                <span>
                  {currentPage} de {totalPages}
                </span>
                <button
                  className="icon-button"
                  aria-label="Próxima página"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <Icon name="ArrowRight" size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              activeFilters
                ? "Nenhum resultado encontrado"
                : "Nenhum orçamento por aqui"
            }
            text={
              activeFilters
                ? "Ajuste a busca ou remova os filtros para ver mais solicitações."
                : undefined
            }
            action={!admin && !activeFilters}
          />
        )}
      </section>
      <div className="subtle-note">
        <Icon name="ShieldCheck" size={16} />A exportação inclui todos os
        resultados filtrados. Consulte os detalhes para ver a proposta e o
        histórico.
      </div>
    </>
  );
}
const initialQuote = {
  service: "",
  equipment: "",
  description: "",
  urgency: "Planejado",
  company: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
};
export function NewQuote() {
  const { user, profile, demo, admin } = useAuth();
  const [params] = useSearchParams();
  const key = draftKey(user.id, demo);
  const [restored] = useState(() => readDraft(key));
  const [step, setStep] = useState(restored?.step || 1);
  const [draftSaved, setDraftSaved] = useState(false);
  const [discard, setDiscard] = useState(false);
  const submitted = useRef(false);
  const formHeading = useRef(null);
  const previousStep = useRef(step);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const freshForm = () => ({
    ...initialQuote,
    service: services.find((s) => s.id === params.get("servico"))?.title || "",
    company: profile?.company || "",
    contact_name: profile?.full_name || "",
    email: profile?.email || user.email || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
  });
  const [form, setForm] = useState(() => ({
    ...freshForm(),
    ...(restored?.form || {}),
  }));
  const hasDraft = Boolean(form.service || form.equipment || form.description);
  useEffect(() => {
    if (admin || submitted.current) return;
    if (hasDraft) setDraftSaved(saveDraft(key, form, step));
    else {
      clearDraft(key);
      setDraftSaved(false);
    }
  }, [key, form, step, admin, hasDraft]);
  useEffect(() => {
    if (previousStep.current !== step) {
      formHeading.current?.focus();
      previousStep.current = step;
    }
  }, [step]);
  function discardDraft() {
    clearDraft(key);
    setForm({ ...freshForm(), service: "" });
    setStep(1);
    setError("");
    setDiscard(false);
    toast("Rascunho descartado.");
  }
  useEffect(() => {
    if (profile)
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(
          [
            ["company", profile.company],
            ["contact_name", profile.full_name],
            ["phone", profile.phone],
            ["address", profile.address],
          ].filter(([k, v]) => !f[k] && v),
        ),
      }));
  }, [profile]);
  function change(e) {
    const { name, value } = e.target;
    if (name in initialQuote) setForm((f) => ({ ...f, [name]: value }));
  }
  async function next(e) {
    e.preventDefault();
    setError("");
    if (step === 1) {
      try {
        validateTechnical(form);
        setStep(2);
      } catch (error) {
        setError(friendly(error));
      }
      return;
    }
    try {
      validateQuote(form);
      if (step === 2) {
        setStep(3);
        return;
      }
      setBusy(true);
      const q = await api.createQuote(user, demo, form);
      submitted.current = true;
      clearDraft(key);
      toast("Solicitação enviada. Você já pode acompanhar o atendimento.");
      navigate(`/app/orcamentos/${q.id}`, { replace: true });
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  if (admin)
    return (
      <>
        <PageHeading
          title="Solicitações de clientes"
          description="Novos pedidos são enviados pelo portal do cliente."
        />
        <ButtonLink to="/app/orcamentos">
          Gerenciar orçamentos <Icon name="ArrowRight" size={17} />
        </ButtonLink>
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="VAMOS ENCONTRAR A SOLUÇÃO"
        title="Solicitar orçamento"
        description="Conte o que sua operação precisa. Nossa equipe cuida dos próximos passos."
      />
      <div className="draft-banner">
        <span>
          <Icon name={draftSaved ? "CheckCircle2" : "FileText"} size={16} />
          {draftSaved
            ? "Rascunho salvo nesta aba"
            : "Seu pedido só será enviado ao confirmar"}
          <small>
            {restored ? "Retome de onde parou. " : ""}Válido por 24 horas nesta
            aba. Apagado ao sair da conta.
          </small>
        </span>
        {hasDraft && (
          <button type="button" onClick={() => setDiscard(true)}>
            Descartar rascunho <Icon name="X" size={14} />
          </button>
        )}
      </div>
      {discard && (
        <Modal title="Descartar rascunho?" onClose={() => setDiscard(false)}>
          <p>
            Os dados desta solicitação serão removidos desta aba. Pedidos já
            enviados permanecem no portal.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDiscard(false)}
            >
              Continuar preenchendo
            </button>
            <button className="button" onClick={discardDraft}>
              Descartar rascunho
            </button>
          </div>
        </Modal>
      )}
      <div className="form-layout">
        <section className="panel quote-form-panel">
          <div className="stepper">
            {[
              "O que você precisa",
              "Dados do atendimento",
              "Revisar e enviar",
            ].map((t, i) => (
              <div
                className={
                  step === i + 1 ? "current" : step > i + 1 ? "completed" : ""
                }
                key={t}
              >
                <span>
                  {step > i + 1 ? <Icon name="Check" size={16} /> : i + 1}
                </span>
                <strong>{t}</strong>
              </div>
            ))}
          </div>
          <form onSubmit={next}>
            <ErrorBox>{error}</ErrorBox>
            {step === 1 && (
              <>
                <div className="form-section-title">
                  <span>01</span>
                  <div ref={formHeading} tabIndex={-1} className="step-heading">
                    <h2>Como podemos ajudar?</h2>
                    <p>Selecione a solução e descreva seu equipamento.</p>
                  </div>
                </div>
                <SelectField
                  label="Tipo de serviço"
                  name="service"
                  value={form.service}
                  onChange={change}
                  required
                >
                  <option value="">Selecione um serviço</option>
                  {services.map((s) => (
                    <option key={s.id}>{s.title}</option>
                  ))}
                </SelectField>
                <Field
                  label="Equipamento"
                  name="equipment"
                  placeholder="Ex.: ponte rolante de 10 toneladas"
                  value={form.equipment}
                  onChange={change}
                  maxLength={200}
                  required
                />
                <label className="field">
                  <span>
                    Descreva sua necessidade <b>*</b>
                  </span>
                  <textarea
                    name="description"
                    placeholder="Descreva o problema, o tipo de equipamento e as informações que podem ajudar nossa análise…"
                    minLength={20}
                    maxLength={5000}
                    value={form.description}
                    onChange={change}
                    rows={5}
                    required
                  />
                  <small>
                    {form.description.length}/5000 caracteres · mínimo de 20
                  </small>
                </label>
                <SelectField
                  label="Previsão do atendimento"
                  name="urgency"
                  value={form.urgency}
                  onChange={change}
                >
                  <option>Planejado</option>
                  <option>O quanto antes</option>
                  <option>Apenas uma cotação</option>
                </SelectField>
              </>
            )}
            {step === 2 && (
              <>
                <div className="form-section-title">
                  <span>02</span>
                  <div ref={formHeading} tabIndex={-1} className="step-heading">
                    <h2>Onde será o atendimento?</h2>
                    <p>Precisamos saber com quem conversar e onde atuar.</p>
                  </div>
                </div>
                <Field
                  label="Empresa"
                  name="company"
                  value={form.company}
                  onChange={change}
                  maxLength={160}
                  required
                />
                <Field
                  label="Nome do contato"
                  name="contact_name"
                  value={form.contact_name}
                  onChange={change}
                  maxLength={120}
                  required
                />
                <div className="form-row">
                  <Field
                    label="E-mail de contato"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={change}
                    required
                    maxLength={254}
                  />
                  <Field
                    label="Telefone com DDD"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={change}
                    maxLength={20}
                    required
                  />
                </div>
                <label className="field">
                  <span>
                    Endereço completo do atendimento <b>*</b>
                  </span>
                  <textarea
                    name="address"
                    placeholder="Rua, número, bairro, cidade, estado e CEP"
                    value={form.address}
                    onChange={change}
                    required
                    maxLength={500}
                    rows={3}
                  />
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <div className="form-section-title">
                  <span>03</span>
                  <div ref={formHeading} tabIndex={-1} className="step-heading">
                    <h2>Está tudo certo?</h2>
                    <p>Confira os dados antes de enviar sua solicitação.</p>
                  </div>
                </div>
                <dl className="review">
                  {[
                    ["Serviço", form.service],
                    ["Equipamento", form.equipment],
                    ["Necessidade", form.description],
                    ["Previsão", form.urgency],
                    ["Empresa", form.company],
                    [
                      "Contato",
                      `${form.contact_name} · ${form.email} · ${form.phone}`,
                    ],
                    ["Local", form.address],
                  ].map(([t, v]) => (
                    <div key={t}>
                      <dt>{t}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="message neutral">
                  <Icon name="CircleHelp" size={18} />
                  <span>
                    A solicitação será analisada pela equipe. O envio não
                    representa contratação ou confirmação de disponibilidade.
                  </span>
                </div>
                <label className="checkbox">
                  <input type="checkbox" required name="consent" />
                  <span>
                    Confirmo os dados e autorizo o contato para atendimento
                    desta solicitação.
                  </span>
                </label>
              </>
            )}
            <div className="form-actions">
              {step > 1 ? (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                  }}
                >
                  <Icon name="ArrowLeft" size={17} />
                  Voltar
                </button>
              ) : (
                <Link className="text-link" to="/app/orcamentos">
                  Cancelar
                </Link>
              )}
              <button className="button" disabled={busy}>
                {busy
                  ? "Enviando…"
                  : step === 3
                    ? "Enviar solicitação"
                    : "Continuar"}
                <Icon
                  name={busy ? "LoaderCircle" : "ArrowRight"}
                  className={busy ? "spin" : ""}
                  size={17}
                />
              </button>
            </div>
          </form>
        </section>
        <aside>
          <div className="panel form-help">
            <span className="service-icon">
              <Icon name="Wrench" size={25} />
            </span>
            <h3>Uma boa descrição faz a diferença.</h3>
            <p>
              Inclua o modelo, a capacidade e a condição atual do equipamento.
              Quanto mais contexto, melhor nossa avaliação.
            </p>
            <hr />
            <Icon name="ShieldCheck" />
            <h4>Atendimento com transparência</h4>
            <p>
              Acompanhe o andamento da análise pelo portal, sem perder nenhuma
              etapa.
            </p>
            <Link className="text-link" to="/app/ajuda">
              Precisa de ajuda? <Icon name="ArrowUpRight" size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
export function QuoteDetail() {
  const { id } = useParams();
  const { demo, admin } = useAuth();
  const { quote, loading, error, refresh } = useQuote(id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  async function update(e) {
    e.preventDefault();
    setSaveError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const amount = data.amount === "" ? null : Number(data.amount);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
      setSaveError("Informe um valor válido.");
      return;
    }
    setBusy(true);
    try {
      await api.updateQuote(demo, id, {
        status: data.status,
        amount,
        notes: data.notes.trim(),
      });
      toast("Orçamento atualizado com sucesso.");
      refresh();
    } catch (e) {
      setSaveError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error) return <Retry error={error} refresh={refresh} />;
  if (!quote)
    return (
      <>
        <PageHeading
          title="Orçamento não encontrado"
          description="A solicitação pode não existir ou você não tem acesso a ela."
        />
        <ButtonLink to="/app/orcamentos">Voltar aos orçamentos</ButtonLink>
      </>
    );
  const q = quote;
  return (
    <>
      <Link className="back-link text-link" to="/app/orcamentos">
        <Icon name="ArrowLeft" size={16} />
        Voltar aos orçamentos
      </Link>
      <PageHeading
        eyebrow={`SOLICITADO EM ${date(q.created_at).toUpperCase()}`}
        title={`Orçamento ${reference(q)}`}
        description={q.service}
      >
        <Badge status={q.status} />
        <button className="button secondary" onClick={() => window.print()}>
          <Icon name="Download" size={17} />
          Imprimir / PDF
        </button>
      </PageHeading>
      <QuoteProgress status={q.status} events={q.events} />
      <div className="detail-grid">
        <div>
          <section className="panel detail-panel">
            <div className="panel-heading">
              <h2>Detalhes da solicitação</h2>
              <Icon name="FileText" size={20} />
            </div>
            <dl className="detail-fields">
              <div>
                <dt>Equipamento</dt>
                <dd>{q.equipment}</dd>
              </div>
              <div>
                <dt>Previsão de atendimento</dt>
                <dd>{q.urgency}</dd>
              </div>
              <div className="wide">
                <dt>Descrição da necessidade</dt>
                <dd className="preserve-lines">{q.description}</dd>
              </div>
              <div>
                <dt>Empresa</dt>
                <dd>{q.company}</dd>
              </div>
              <div>
                <dt>Contato</dt>
                <dd>{q.contact_name}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{q.email}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{q.phone}</dd>
              </div>
              <div className="wide">
                <dt>Local do atendimento</dt>
                <dd>{q.address}</dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-panel proposal">
            <div className="panel-heading">
              <h2>Proposta e observações</h2>
              <Icon name="MessagesSquare" size={21} />
            </div>
            <div className="proposal-content">
              <span>VALOR DO ORÇAMENTO</span>
              <strong>{money(q.amount)}</strong>
              <p className="preserve-lines">
                {q.notes ||
                  (q.amount != null
                    ? "O valor foi informado pela equipe. Entre em contato para confirmar o escopo e as condições do atendimento."
                    : "A equipe ainda não adicionou uma proposta. As informações aparecerão aqui assim que estiverem disponíveis.")}
              </p>
              <p className="subtle">
                Valores e condições sujeitos à confirmação com a equipe. Para
                responder à proposta, entre em contato informando o número do
                orçamento.
              </p>
              <a
                className="text-link"
                href={`mailto:contato@srservice.com.br?subject=${encodeURIComponent(`Atendimento ${reference(q)}`)}`}
              >
                Conversar sobre este orçamento{" "}
                <Icon name="ArrowUpRight" size={16} />
              </a>
            </div>
          </section>
          {admin && (
            <section className="panel detail-panel admin-update">
              <div className="panel-heading">
                <h2>Atualizar atendimento</h2>
                <span className="admin-tag">EQUIPE SR</span>
              </div>
              <form
                onSubmit={update}
                key={`${q.status}-${q.amount}-${q.notes}`}
              >
                <ErrorBox>{saveError}</ErrorBox>
                <div className="form-row">
                  <SelectField
                    label="Status"
                    name="status"
                    defaultValue={q.status}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </SelectField>
                  <Field
                    label="Valor da proposta (R$)"
                    name="amount"
                    type="number"
                    min="0"
                    max="999999999"
                    step="0.01"
                    defaultValue={q.amount ?? ""}
                    placeholder="0,00"
                  />
                </div>
                <label className="field">
                  <span>Observações visíveis ao cliente</span>
                  <textarea
                    name="notes"
                    defaultValue={q.notes}
                    rows={4}
                    maxLength={5000}
                    placeholder="Informe escopo, condições comerciais e próximos passos…"
                  />
                </label>
                <button className="button" disabled={busy}>
                  {busy ? "Salvando…" : "Salvar atualização"}
                  <Icon name="Check" size={17} />
                </button>
              </form>
            </section>
          )}
        </div>
        <aside>
          <section className="panel timeline-panel">
            <h2>Histórico do atendimento</h2>
            <p>Transparência em cada etapa.</p>
            <ol className="timeline">
              {[...(q.events || [])]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((event, i) => (
                  <li key={event.id} className={i === 0 ? "current" : ""}>
                    <span className="timeline-dot">
                      <Icon name={i === 0 ? "Clock3" : "Check"} size={14} />
                    </span>
                    <strong>{event.status}</strong>
                    <small>{date(event.created_at)}</small>
                  </li>
                ))}
            </ol>
          </section>
          <div className="detail-help">
            <Icon name="CircleHelp" />
            <h3>Alguma dúvida?</h3>
            <p>
              Fale com a equipe e informe o número {reference(q)} para facilitar
              o atendimento.
            </p>
            <Link className="text-link" to="/contato">
              Entrar em contato <Icon name="ArrowUpRight" size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Profile() {
  const { user, profile, setProfile, demo } = useAuth();
  const [busy, setBusy] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [error, setError] = useState("");
  const [passError, setPassError] = useState("");
  const toast = useToast();
  async function save(e) {
    e.preventDefault();
    setError("");
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      validateProfile(payload);
      setProfile(await api.saveProfile(user, demo, { ...profile, ...payload }));
      toast(
        demo
          ? "Perfil de demonstração atualizado neste navegador."
          : "Perfil atualizado com sucesso.",
      );
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  async function password(e) {
    e.preventDefault();
    setPassError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.password !== data.confirm) {
      setPassError("As senhas precisam ser iguais.");
      return;
    }
    if (demo) {
      setPassError(
        "A demonstração não possui senha. Use uma conta real para alterar seu acesso.",
      );
      return;
    }
    setPassBusy(true);
    try {
      await changePassword(data.password);
      form.reset();
      toast("Senha atualizada com sucesso.");
    } catch (e) {
      setPassError(friendly(e));
    } finally {
      setPassBusy(false);
    }
  }
  if (!profile)
    return (
      <ErrorBox>
        Não foi possível carregar seu perfil. Confira a configuração do Firebase
        ou entre novamente.
      </ErrorBox>
    );
  return (
    <>
      <PageHeading
        eyebrow="SUA CONTA"
        title="Meu perfil"
        description="Mantenha seus dados atualizados para um atendimento mais próximo."
      />
      <div className="form-layout">
        <div>
          <section className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <h2>Informações pessoais e da empresa</h2>
                <p>Seus dados de contato no portal.</p>
              </div>
              <Icon name="UserRound" />
            </div>
            <form onSubmit={save} key={profile.id}>
              <ErrorBox>{error}</ErrorBox>
              <Field
                label="Nome completo"
                name="full_name"
                defaultValue={profile.full_name}
                maxLength={120}
                required
              />
              <Field
                label="E-mail de acesso"
                name="email"
                type="email"
                value={user.email || profile.email}
                disabled
              />
              <div className="form-row">
                <Field
                  label="Telefone com DDD"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone}
                  maxLength={20}
                  required
                />
                <Field
                  label="CPF ou CNPJ (opcional)"
                  name="document"
                  defaultValue={profile.document}
                  maxLength={20}
                />
              </div>
              <Field
                label="Empresa"
                name="company"
                defaultValue={profile.company}
                maxLength={160}
              />
              <Field
                label="Endereço"
                name="address"
                defaultValue={profile.address}
                maxLength={500}
              />
              <button className="button" disabled={busy}>
                {busy ? "Salvando…" : "Salvar alterações"}
                <Icon name="Check" size={17} />
              </button>
            </form>
          </section>
          <section className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <h2>Segurança da conta</h2>
                <p>Escolha uma senha exclusiva com pelo menos 8 caracteres.</p>
              </div>
              <Icon name="LockKeyhole" />
            </div>
            <form onSubmit={password}>
              <ErrorBox>{passError}</ErrorBox>
              <div className="form-row">
                <Field
                  label="Nova senha"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
                <Field
                  label="Confirmar nova senha"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <button className="button secondary" disabled={passBusy}>
                {passBusy ? "Atualizando…" : "Atualizar senha"}
                <Icon name="ArrowRight" size={17} />
              </button>
            </form>
          </section>
        </div>
        <aside className="panel form-help">
          <Icon name="ShieldCheck" size={30} />
          <h3>Seus dados, com cuidado.</h3>
          <p>
            Suas informações são utilizadas no atendimento e na preparação das
            solicitações.
          </p>
          <Link className="text-link" to="/privacidade">
            Conheça a política de privacidade{" "}
            <Icon name="ArrowUpRight" size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function Customers() {
  const { quotes, loading, error, refresh } = useQuotes();
  const [search, setSearch] = useState("");
  const customers = Object.values(
    quotes.reduce((acc, q) => {
      if (!acc[q.user_id]) acc[q.user_id] = { ...q, count: 0 };
      acc[q.user_id].count++;
      return acc;
    }, {}),
  ).filter((c) =>
    `${c.company} ${c.contact_name} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="RELACIONAMENTO"
        title="Clientes"
        description="Contatos com solicitações de orçamento no portal."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>Carteira de atendimento</h2>
          <label className="search">
            <Icon name="Search" size={17} />
            <input
              aria-label="Buscar cliente"
              placeholder="Buscar cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Retry error={error} refresh={refresh} />
        ) : customers.length ? (
          <div className="table-scroll">
            <table className="quote-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>CONTATO</th>
                  <th>TELEFONE</th>
                  <th>SOLICITAÇÕES</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.user_id}>
                    <td>
                      <strong>{c.company}</strong>
                    </td>
                    <td>
                      {c.contact_name}
                      <small>{c.email}</small>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.count}</td>
                    <td>
                      <Link
                        to={`/app/orcamentos?busca=${encodeURIComponent(c.company)}`}
                        className="text-link"
                      >
                        Ver pedidos <Icon name="ArrowUpRight" size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nenhum cliente encontrado"
            text="Os contatos aparecem aqui quando enviam solicitações."
            action={false}
          />
        )}
      </section>
    </>
  );
}
export function Help() {
  const faqs = [
    [
      "Como solicito um orçamento?",
      "Acesse “Novo orçamento”, selecione o serviço, descreva o equipamento e informe os dados do atendimento. Revise as informações e envie. Você receberá um número para acompanhamento.",
    ],
    [
      "Onde acompanho o andamento?",
      "Em “Meus orçamentos”, clique no número da solicitação. Os detalhes mostram o status atual, o histórico e as observações enviadas pela equipe.",
    ],
    [
      "O que significa cada status?",
      "Recebido: solicitação registrada. Em análise: avaliação da necessidade. Proposta enviada: condições disponíveis para consulta. Aprovado: aprovação registrada pela equipe após contato. Em execução: atendimento iniciado. Concluído: serviço finalizado. Cancelado: solicitação encerrada sem continuidade.",
    ],
    [
      "Como respondo a uma proposta?",
      "Abra o orçamento e use “Conversar sobre este orçamento”. O e-mail incluirá o número da solicitação. A equipe poderá confirmar as condições e registrar os próximos passos.",
    ],
    [
      "Posso alterar uma solicitação enviada?",
      "Entre em contato informando o número do orçamento e as informações a corrigir. Os dados enviados são preservados para manter o histórico do atendimento.",
    ],
    [
      "Como recupero minha senha?",
      "Na tela de login, clique em “Esqueci minha senha”. Informe o e-mail cadastrado e siga o link de recuperação enviado para sua caixa de entrada.",
    ],
    [
      "A demonstração utiliza dados reais?",
      "Não. Os registros são fictícios e suas alterações ficam somente neste navegador. Nenhum pedido feito na demonstração é enviado à equipe. Não informe dados pessoais reais nesse ambiente.",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow="ESTAMOS POR PERTO"
        title="Como podemos ajudar?"
        description="Encontre respostas e siga com seu atendimento."
      />
      <div className="help-grid">
        <section className="panel faq-panel">
          <h2>Perguntas frequentes</h2>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Icon name="Plus" size={17} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <aside className="panel form-help">
          <Icon name="MessagesSquare" size={32} />
          <h3>Prefere conversar?</h3>
          <p>
            Envie sua dúvida e, se já tiver um orçamento, informe o número da
            solicitação.
          </p>
          <a className="button" href="mailto:contato@srservice.com.br">
            Falar com a equipe <Icon name="ArrowUpRight" size={17} />
          </a>
          <Link to="/servicos" className="text-link">
            Conhecer nossos serviços <Icon name="ArrowRight" size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
