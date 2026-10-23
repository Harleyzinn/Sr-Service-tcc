import { Link } from "react-router-dom";
import { Icon } from "./ui";
import { statusGuidance } from "./domain";
const stages = [
  ["Recebido", "Recebidos", "Files"],
  ["Em análise", "Em análise", "Search"],
  ["Proposta enviada", "Propostas", "FileText"],
  ["Em execução", "Em execução", "Wrench"],
];
export function Workflow({ quotes, admin }) {
  const needing = quotes.filter((q) =>
    admin ? q.status === "Recebido" : q.status === "Proposta enviada",
  );
  return (
    <section className="panel workflow-panel">
      <div className="panel-heading">
        <div>
          <h2>Seu atendimento em foco</h2>
          <p>Encontre rapidamente o próximo passo.</p>
        </div>
        <span className="workflow-live">
          <i />
          Visão dos pedidos
        </span>
      </div>
      <div className="workflow-stages">
        {stages.map(([status, label, icon]) => {
          const count = quotes.filter((q) => q.status === status).length;
          return (
            <Link
              key={status}
              to={`/app/orcamentos?status=${encodeURIComponent(status)}`}
              className={`workflow-stage ${count ? "has-items" : ""}`}
            >
              <span className="workflow-stage-icon">
                <Icon name={icon} size={18} />
              </span>
              <div>
                <strong>{String(count).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
              <Icon name="ArrowUpRight" size={16} />
            </Link>
          );
        })}
      </div>
      {needing.length > 0 ? (
        <div className="attention-strip">
          <Icon name={admin ? "Files" : "FileText"} size={19} />
          <div>
            <strong>
              {needing.length}{" "}
              {admin
                ? "solicitação aguardando análise"
                : "proposta disponível para consulta"}
              {needing.length > 1 ? " · confira os pedidos" : ""}
            </strong>
            <p>
              {admin
                ? "Novas solicitações prontas para a primeira avaliação."
                : "Consulte as condições e converse com a equipe sobre o próximo passo."}
            </p>
          </div>
          <Link
            to={`/app/orcamentos?status=${encodeURIComponent(admin ? "Recebido" : "Proposta enviada")}`}
          >
            Conferir <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
      ) : (
        <div className="attention-strip quiet">
          <Icon name="ShieldCheck" size={18} />
          <span>
            {admin
              ? "Nenhuma nova solicitação aguardando a primeira análise."
              : "As próximas propostas aparecerão aqui quando estiverem disponíveis."}
          </span>
        </div>
      )}
    </section>
  );
}
export function QuoteProgress({ status, events = [] }) {
  const current = statusGuidance[status] || statusGuidance.Recebido;
  const steps = [
    "Recebido",
    "Em análise",
    "Proposta enviada",
    "Aprovado",
    "Em execução",
    "Concluído",
  ];
  const index = steps.indexOf(status);
  return (
    <section
      className={`quote-progress-panel ${status === "Cancelado" ? "cancelled" : ""}`}
      aria-label="Andamento do orçamento"
    >
      <div className="progress-explanation">
        <span>
          <Icon name={current.icon} size={24} />
        </span>
        <div>
          <h2>{current.title}</h2>
          <p>{current.text}</p>
        </div>
      </div>
      {status !== "Cancelado" && (
        <ol className="quote-progress">
          {steps.map((s, i) => (
            <li
              key={s}
              className={
                i === index
                  ? "current"
                  : events.some((event) => event.status === s)
                    ? "done"
                    : ""
              }
              aria-current={i === index ? "step" : undefined}
            >
              <span>
                {i !== index && events.some((event) => event.status === s) ? (
                  <Icon name="Check" size={13} />
                ) : (
                  i + 1
                )}
              </span>
              <strong>{s}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
