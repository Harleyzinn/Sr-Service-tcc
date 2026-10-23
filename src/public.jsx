import { useState } from "react";
import { Link } from "react-router-dom";
import { services, searchText } from "./domain";
import { Brand, ButtonLink, Eyebrow, Icon } from "./ui";
function ServiceCard({ service, index }) {
  return (
    <Link to={`/servicos#${service.id}`} className="service-card">
      <div className="service-top">
        <span className="service-icon">
          <Icon name={service.icon} size={25} />
        </span>
        <span className="service-number">0{index + 1}</span>
      </div>
      <h3>{service.short}</h3>
      <p>{service.text}</p>
      <span className="service-more">
        Conhecer solução <Icon name="ArrowUpRight" size={18} />
      </span>
    </Link>
  );
}
export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-photo" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <Eyebrow>PRECISÃO. CONFIANÇA. MOVIMENTO.</Eyebrow>
            <h1>
              Sua indústria
              <br />
              em <em>boas mãos.</em>
            </h1>
            <p>
              Manutenção, modernização e componentes para equipamentos de
              elevação. A expertise que sua operação precisa para ir mais longe.
            </p>
            <div className="hero-buttons">
              <ButtonLink to="/app/novo-orcamento">
                Vamos falar do seu projeto{" "}
                <Icon name="ArrowUpRight" size={19} />
              </ButtonLink>
              <Link className="hero-secondary" to="/servicos">
                Explore nossas soluções <Icon name="ArrowRight" size={18} />
              </Link>
            </div>
            <div className="hero-trust">
              <span>
                <Icon name="ShieldCheck" />
                Segurança em cada etapa
              </span>
              <span>
                <Icon name="Wrench" />
                Atendimento especializado
              </span>
            </div>
          </div>
          <div className="hero-caption">
            <span className="caption-line" />
            <span>
              EXPERTISE QUE FAZ A DIFERENÇA
              <small>Do diagnóstico à solução.</small>
            </span>
            <span className="image-index">EXPERTISE INDUSTRIAL</span>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="container">
            <span>
              SR SERVICE <b>CRANES & COMPONENTS</b>
            </span>
            <span>
              Elevando a eficiência. Conectando soluções.{" "}
              <Icon name="ArrowDown" size={16} />
            </span>
          </div>
        </div>
      </section>
      <section className="capability-strip">
        <div className="container">
          <span>
            <Icon name="HardHat" />
            Pontes rolantes
          </span>
          <span>
            <Icon name="Settings2" />
            Talhas e componentes
          </span>
          <span>
            <Icon name="Zap" />
            Sistemas de elevação
          </span>
          <span>
            <Icon name="ShieldCheck" />
            Soluções para sua indústria
          </span>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <Eyebrow>SOLUÇÕES QUE MOVEM</Eyebrow>
            <h2>
              Um parceiro técnico.
              <br />
              <span>Todas as soluções.</span>
            </h2>
          </div>
          <div>
            <p>
              Da manutenção à modernização, cuidamos de cada detalhe para sua
              operação seguir em frente.
            </p>
            <Link to="/servicos" className="text-link">
              Todos os serviços <Icon name="ArrowUpRight" size={18} />
            </Link>
          </div>
        </div>
        <div className="services-grid">
          {services.slice(0, 3).map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </div>
      </section>
      <section className="about-section">
        <div className="container about-grid">
          <div className="about-photo">
            <img
              src="/images/4.jpg"
              alt="Equipamento industrial atendido pela SR Service"
              loading="lazy"
            />
            <div className="photo-label">
              <Icon name="ShieldCheck" size={26} />
              <span>
                Compromisso com a operação.
                <br />
                <strong>Em cada detalhe.</strong>
              </span>
            </div>
          </div>
          <div className="about-copy">
            <Eyebrow>CONHEÇA A SR SERVICE</Eyebrow>
            <h2>
              Conhecimento técnico.
              <br />
              <span>Compromisso de verdade.</span>
            </h2>
            <p>
              Somos especialistas em movimentação de cargas. Conectamos
              experiência prática e atenção às necessidades de cada cliente para
              entregar soluções que fazem sentido para a sua indústria.
            </p>
            <div className="check-list">
              {[
                "Diagnóstico cuidadoso e orientação transparente",
                "Soluções para diferentes necessidades industriais",
                "Acompanhamento do primeiro contato à entrega",
              ].map((t) => (
                <p key={t}>
                  <Icon name="CheckCircle2" size={19} />
                  {t}
                </p>
              ))}
            </div>
            <ButtonLink to="/sobre" secondary>
              Conheça nossa história <Icon name="ArrowUpRight" size={17} />
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <Eyebrow>SIMPLES DO INÍCIO AO FIM</Eyebrow>
            <h2>
              Seu próximo projeto,
              <br />
              <span>mais perto da solução.</span>
            </h2>
          </div>
          <p>Um atendimento organizado para você ter clareza em cada etapa.</p>
        </div>
        <div className="process-grid">
          {[
            [
              "01",
              "Conte o que precisa",
              "Descreva o equipamento e a necessidade da sua operação.",
            ],
            [
              "02",
              "Analisamos juntos",
              "Nossa equipe avalia as informações e prepara os próximos passos.",
            ],
            [
              "03",
              "Acompanhe tudo",
              "Consulte o andamento e a proposta pelo portal do cliente.",
            ],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
function CTA() {
  return (
    <section className="cta">
      <div className="container">
        <div>
          <Eyebrow>VAMOS CONSTRUIR A PRÓXIMA SOLUÇÃO?</Eyebrow>
          <h2>
            O próximo movimento
            <br />
            da sua indústria começa aqui.
          </h2>
        </div>
        <ButtonLink to="/app/novo-orcamento">
          Solicitar um orçamento <Icon name="ArrowUpRight" />
        </ButtonLink>
      </div>
    </section>
  );
}
export function Services() {
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="public-page-heading">
        <div className="container">
          <Eyebrow>EXPERTISE DE PONTA A PONTA</Eyebrow>
          <h1>
            Soluções para manter
            <br />
            sua operação em movimento.
          </h1>
          <p>
            Cuidado técnico para cada equipamento. A solução certa para cada
            desafio.
          </p>
        </div>
      </div>
      <section className="section container">
        <div className="service-filter">
          <span>Explore nossas especialidades</span>
          <label className="search">
            <Icon name="Search" size={18} />
            <input
              aria-label="Buscar serviço"
              placeholder="Buscar uma solução…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="service-detail-list">
          {services
            .filter((s) =>
              searchText(`${s.title} ${s.text}`).includes(searchText(search)),
            )
            .map((s, i) => (
              <article id={s.id} key={s.id} className="service-detail">
                <img src={`/images/${s.image}`} alt={s.title} loading="lazy" />
                <div>
                  <div className="small-eyebrow">
                    SOLUÇÃO 0{services.indexOf(s) + 1} <Icon name={s.icon} />
                  </div>
                  <h2>{s.title}</h2>
                  <p>{s.text}</p>
                  <ul className="check-list">
                    {s.items.map((t) => (
                      <li key={t}>
                        <Icon name="Check" size={17} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink
                    to={`/app/novo-orcamento?servico=${s.id}`}
                    secondary
                  >
                    Solicitar este serviço{" "}
                    <Icon name="ArrowUpRight" size={17} />
                  </ButtonLink>
                </div>
              </article>
            ))}
        </div>
        {!services.some((s) =>
          searchText(`${s.title} ${s.text}`).includes(searchText(search)),
        ) && (
          <div className="empty">
            <h3>Nenhuma solução encontrada</h3>
            <p>Tente outro termo ou converse com nossa equipe.</p>
            <button className="button secondary" onClick={() => setSearch("")}>
              Limpar busca
            </button>
          </div>
        )}
      </section>
      <CTA />
    </>
  );
}
export function About() {
  return (
    <>
      <div className="public-page-heading">
        <div className="container">
          <Eyebrow>SOMOS A SR SERVICE</Eyebrow>
          <h1>
            Mais que equipamentos.
            <br />O compromisso de mover.
          </h1>
          <p>
            Conhecimento, proximidade e responsabilidade em cada solução
            industrial.
          </p>
        </div>
      </div>
      <section className="section container about-grid">
        <img
          className="rounded-image"
          src="/images/4.jpg"
          alt="Soluções industriais da SR Service"
        />
        <div>
          <Eyebrow>NOSSA ESSÊNCIA</Eyebrow>
          <h2>
            De perto, entendemos.
            <br />
            Juntos, resolvemos.
          </h2>
          <p>
            A SR Service atua na manutenção, modernização e fornecimento de
            componentes para pontes rolantes e equipamentos de elevação.
          </p>
          <p>
            Nosso trabalho começa em entender o contexto de cada operação. A
            partir dessa escuta, buscamos soluções técnicas adequadas ao
            equipamento, à aplicação e às necessidades do cliente.
          </p>
          <p>
            Do primeiro diagnóstico ao acompanhamento do serviço, valorizamos
            comunicação clara, planejamento e atenção aos detalhes.
          </p>
        </div>
      </section>
      <section className="values-section">
        <div className="container services-grid">
          {[
            [
              "ShieldCheck",
              "Segurança",
              "Cuidado com as pessoas, os equipamentos e cada etapa da operação.",
            ],
            [
              "Wrench",
              "Precisão técnica",
              "Conhecimento aplicado para identificar necessidades e orientar decisões.",
            ],
            [
              "MessagesSquare",
              "Proximidade",
              "Relacionamento transparente e acompanhamento ao longo do atendimento.",
            ],
          ].map(([icon, title, p]) => (
            <div className="value" key={title}>
              <Icon name={icon} size={30} />
              <h3>{title}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
export function Contact() {
  return (
    <>
      <div className="public-page-heading">
        <div className="container">
          <Eyebrow>VAMOS CONVERSAR</Eyebrow>
          <h1>
            Qual é o próximo desafio
            <br />
            da sua operação?
          </h1>
          <p>Escolha o melhor caminho para falar com a SR Service.</p>
        </div>
      </div>
      <section className="section container contact-grid">
        <div className="panel contact-panel">
          <Icon name="FileText" size={32} />
          <h2>Precisa de uma solução?</h2>
          <p>
            Envie os detalhes do equipamento e acompanhe a análise pelo portal
            do cliente.
          </p>
          <ButtonLink to="/app/novo-orcamento">
            Solicitar orçamento <Icon name="ArrowUpRight" size={17} />
          </ButtonLink>
        </div>
        <div className="panel contact-panel">
          <Icon name="Mail" size={32} />
          <h2>Fale com nossa equipe</h2>
          <p>
            Para dúvidas gerais, informações sobre serviços ou acompanhamento
            comercial.
          </p>
          <a className="text-link" href="mailto:contato@srservice.com.br">
            contato@srservice.com.br <Icon name="ArrowUpRight" size={18} />
          </a>
        </div>
      </section>
      <div className="container contact-note">
        <Icon name="CircleHelp" />
        <p>
          Já tem uma solicitação?{" "}
          <Link to="/app/orcamentos">Acesse seus orçamentos</Link> para
          consultar as informações e o andamento.
        </p>
      </div>
    </>
  );
}
export function Privacy() {
  return (
    <article className="container section legal">
      <Eyebrow>TRANSPARÊNCIA</Eyebrow>
      <h1>Privacidade e proteção de dados</h1>
      <p className="lead">
        Informações sobre o uso de dados no portal SR Service.
      </p>
      <h2>Dados utilizados no atendimento</h2>
      <p>
        O cadastro utiliza nome, e-mail e telefone. Empresa, documento e
        endereço podem ser informados no perfil. Solicitações incluem os dados
        de contato, localização e descrição do equipamento necessários para
        avaliar o serviço.
      </p>
      <h2>Finalidade e acesso</h2>
      <p>
        Os dados são utilizados para autenticação, elaboração e acompanhamento
        de orçamentos e atendimento. Cada cliente acessa suas próprias
        solicitações. A equipe administrativa autorizada acessa os dados
        necessários ao atendimento.
      </p>
      <h2>Autenticação e armazenamento</h2>
      <p>
        A autenticação é processada pelo Firebase Authentication. O aplicativo
        não armazena senhas em suas documentos de perfil. A sessão é mantida no
        navegador para permitir o acesso à conta. Na demonstração, somente
        registros fictícios são armazenados localmente; evite inserir dados
        pessoais reais nesse ambiente.
      </p>
      <h2>Seus dados</h2>
      <p>
        Durante o preenchimento de um orçamento, um rascunho é salvo nesta aba
        por até 24 horas para permitir retomar a solicitação. Ele não é enviado
        à equipe até a confirmação e é removido ao descartar, enviar o pedido ou
        sair da conta.
      </p>
      <p>
        Você pode corrigir informações no perfil. Para solicitar acesso,
        correção adicional ou exclusão de dados, entre em contato pelo e-mail
        abaixo. A equipe deverá confirmar sua identidade e avaliar as obrigações
        de retenção aplicáveis ao atendimento.
      </p>
      <h2>Contato</h2>
      <a className="text-link" href="mailto:contato@srservice.com.br">
        contato@srservice.com.br <Icon name="ArrowUpRight" size={16} />
      </a>
    </article>
  );
}
export function NotFound() {
  return (
    <div className="container section not-found">
      <Eyebrow>ERRO 404</Eyebrow>
      <h1>Esse caminho não existe.</h1>
      <p>Vamos levar você de volta ao lugar certo.</p>
      <ButtonLink to="/">
        Voltar ao início <Icon name="ArrowRight" size={17} />
      </ButtonLink>
    </div>
  );
}
