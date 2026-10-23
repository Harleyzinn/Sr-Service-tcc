import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useId,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  Wrench,
  Zap,
  ClipboardCheck,
  HardHat,
  Settings2,
  MessagesSquare,
  LayoutDashboard,
  Files,
  Plus,
  UserRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CircleHelp,
  Building2,
  Mail,
  Check,
  AlertCircle,
  LoaderCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Search,
  Clock3,
  CheckCircle2,
  FileText,
  Download,
  Upload,
  SlidersHorizontal,
  MapPin,
  LockKeyhole,
  TrendingUp,
  RefreshCw,
  Wallet,
  CreditCard,
  Target,
  CalendarDays,
  Bell,
  Minus,
  ArrowLeftRight,
  ArrowDownLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "./auth";
import { friendly } from "./api";
import { ThemeToggle } from "./theme";
export const icons = {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  Wrench,
  Zap,
  ClipboardCheck,
  HardHat,
  Settings2,
  MessagesSquare,
  LayoutDashboard,
  Files,
  Plus,
  UserRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CircleHelp,
  Building2,
  Mail,
  Check,
  AlertCircle,
  LoaderCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Search,
  Clock3,
  CheckCircle2,
  FileText,
  Download,
  Upload,
  SlidersHorizontal,
  MapPin,
  LockKeyhole,
  TrendingUp,
  RefreshCw,
  Wallet,
  CreditCard,
  Target,
  CalendarDays,
  Bell,
  Minus,
  ArrowLeftRight,
  ArrowDownLeft,
  Sun,
  Moon,
};
export const Icon = ({ name, size = 20, ...props }) => {
  const Component = icons[name] || FileText;
  return <Component size={size} strokeWidth={1.7} {...props} />;
};
export function Brand({ light = false }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? "light" : ""}`}
      aria-label="SR Service — início"
    >
      <span className="brand-symbol">
        SR<span>↗</span>
      </span>
      <span className="brand-name">
        SERVICE<small>CRANES & COMPONENTS</small>
      </span>
    </Link>
  );
}
export const ButtonLink = ({ to, children, secondary, ...props }) => (
  <Link to={to} className={`button ${secondary ? "secondary" : ""}`} {...props}>
    {children}
  </Link>
);
export const Eyebrow = ({ children }) => (
  <div className="eyebrow">
    <span />
    {children}
  </div>
);
export function Field({ label, name, type = "text", error, ...props }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const id = props.id || name;
  return (
    <label className={`field ${props.className || ""}`} htmlFor={id}>
      <span>
        {label}
        {props.required && <b aria-hidden="true"> *</b>}
      </span>
      <div className="input-wrap">
        <input
          {...props}
          className=""
          id={id}
          name={name}
          aria-label={label}
          type={type === "password" && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyUp={(event) => {
            if (type === "password")
              setCapsLock(event.getModifierState("CapsLock"));
            props.onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            props.onBlur?.(event);
          }}
        />
        {type === "password" && (
          <button
            type="button"
            className="password-toggle"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? "EyeOff" : "Eye"} size={18} />
          </button>
        )}
      </div>
      {capsLock && (
        <small className="caps-lock" role="status">
          Caps Lock está ativado.
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="error-text">
          {error}
        </small>
      )}
    </label>
  );
}
export function SelectField({ label, name, children, ...props }) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && <b aria-hidden="true"> *</b>}
      </span>
      <select name={name} {...props}>
        {children}
      </select>
    </label>
  );
}
export const ErrorBox = ({ children }) =>
  children ? (
    <div className="message error" role="alert">
      <Icon name="AlertCircle" size={19} />
      <span>{children}</span>
    </div>
  ) : null;
export const SuccessBox = ({ children }) => (
  <div className="message success" role="status">
    <Icon name="CheckCircle2" size={19} />
    <span>{children}</span>
  </div>
);
export const Loading = () => (
  <div className="loading" role="status">
    <Icon name="LoaderCircle" className="spin" /> Carregando…
  </div>
);
export const Badge = ({ status }) => (
  <span
    className={`badge status-${status
      .replaceAll(" ", "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()}`}
  >
    <i />
    {status}
  </span>
);
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  return (
    <ToastContext.Provider value={setToast}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Icon name="CheckCircle2" />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <Icon name="X" size={17} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => {
      try {
        document
          .getElementById(decodeURIComponent(hash.slice(1)))
          ?.scrollIntoView({ block: "start" });
      } catch {
        /* ignore malformed URL fragments */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles = {
      "/": "Início",
      "/servicos": "Serviços",
      "/sobre": "Sobre nós",
      "/contato": "Contato",
      "/login": "Entrar",
      "/cadastro": "Criar conta",
      "/recuperar-senha": "Recuperar senha",
      "/redefinir-senha": "Nova senha",
      "/app": "Visão geral",
      "/app/orcamentos": "Orçamentos",
      "/app/novo-orcamento": "Novo orçamento",
      "/app/perfil": "Meu perfil",
      "/app/financeiro": "Financeiro",
      "/app/configuracoes": "Preferências",
      "/app/chat": "Chat",
      "/app/clientes": "Clientes",
      "/app/ajuda": "Central de ajuda",
      "/privacidade": "Privacidade",
    };
    document.title = `${titles[pathname] || "Orçamento"} · SR Service`;
  }, [pathname]);
  return null;
}
export function PublicLayout() {
  const [menu, setMenu] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  return (
    <>
      <div className="top-strip">
        <div className="container">
          <span>ENGENHARIA QUE MANTÉM SUA INDÚSTRIA EM MOVIMENTO.</span>
          <a href="mailto:contato@srservice.com.br">
            <Icon name="Mail" size={13} /> contato@srservice.com.br
          </a>
        </div>
      </div>
      <header className="public-header">
        <div className="container">
          <Brand />
          <button
            className="menu-toggle icon-button"
            aria-label="Abrir menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "X" : "Menu"} />
          </button>
          <nav className={menu ? "open" : ""} aria-label="Navegação principal">
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/sobre">Sobre nós</NavLink>
            <NavLink to="/servicos">Soluções e serviços</NavLink>
            <NavLink to="/contato">Contato</NavLink>
            <Link className="header-login" to={user ? "/app" : "/login"}>
              <Icon name="UserRound" size={17} />
              {user ? "Meu portal" : "Área do cliente"}
            </Link>
            <ButtonLink to="/app/novo-orcamento">
              Solicitar orçamento <Icon name="ArrowUpRight" size={17} />
            </ButtonLink>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Brand light />
            <p>
              Expertise técnica para elevar
              <br />o potencial da sua operação.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/sobre">Sobre a SR Service</Link>
            <Link to="/servicos">Soluções e serviços</Link>
            <Link to="/contato">Fale com a equipe</Link>
          </div>
          <div>
            <h4>Portal do cliente</h4>
            <Link to="/login">Acessar minha conta</Link>
            <Link to="/app/novo-orcamento">Solicitar orçamento</Link>
            <Link to="/app/orcamentos">Acompanhar solicitações</Link>
          </div>
          <div>
            <h4>Vamos conversar?</h4>
            <a href="mailto:contato@srservice.com.br">
              contato@srservice.com.br <Icon name="ArrowUpRight" size={15} />
            </a>
            <p>
              Manutenção, componentes e soluções
              <br />
              em movimentação de cargas.
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} SR Service. Todos os direitos
            reservados.
          </span>
          <Link to="/privacidade">Privacidade e proteção de dados</Link>
          <span>
            Feito para mover sua indústria. <i />
          </span>
        </div>
      </footer>
      <Link
        className="chat-launcher"
        to="/app/chat"
        aria-label="Abrir chat com a equipe"
      >
        <Icon name="MessagesSquare" size={20} />
        <span>Chat com a equipe</span>
      </Link>
    </>
  );
}
export function PortalLayout() {
  const { profile, user, demo, admin, logout, error } = useAuth();
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem("sr-sidebar-compact") === "true";
    } catch {
      return false;
    }
  });
  const [logoutError, setLogoutError] = useState("");
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const targets = () => [
      ...sidebarRef.current.querySelectorAll("a,button:not([disabled])"),
    ];
    targets()[0]?.focus();
    const closeOnWide = () => {
      if (window.innerWidth > 760) setMenu(false);
    };
    const keyboard = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(false);
      }
      if (e.key === "Tab") {
        const list = targets();
        const first = list[0];
        const last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    window.addEventListener("resize", closeOnWide);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", closeOnWide);
      previous?.focus();
    };
  }, [menu]);
  const links = [
    ["/app", "LayoutDashboard", "Visão geral"],
    [
      "/app/orcamentos",
      "Files",
      admin ? "Todos os orçamentos" : "Meus orçamentos",
    ],
    ...(!admin
      ? [["/app/novo-orcamento", "Plus", "Novo orçamento"]]
      : [["/app/clientes", "Building2", "Clientes"]]),
    ["/app/financeiro", "Wallet", "Meu financeiro"],
    ["/app/chat", "MessagesSquare", admin ? "Conversas" : "Chat com a equipe"],
    ["/app/historico", "FileText", "Histórico anterior"],
  ];
  async function exit() {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      setLogoutError(friendly(e));
    }
  }
  const initials = (profile?.full_name || "SR")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  const currentPage =
    [
      ...links,
      ["/app/perfil", "", "Meu perfil"],
      ["/app/configuracoes", "", "Preferências"],
      ["/app/ajuda", "", "Central de ajuda"],
    ].find(([path]) => path === location.pathname)?.[2] ||
    "Detalhes do orçamento";
  function toggleCompact() {
    setCompact((value) => {
      try {
        localStorage.setItem("sr-sidebar-compact", String(!value));
      } catch {
        /* Layout remains usable without storage. */
      }
      return !value;
    });
  }
  return (
    <div className={`portal ${compact ? "sidebar-compact" : ""}`}>
      <button
        className={`sidebar-scrim ${menu ? "visible" : ""}`}
        aria-label="Fechar menu"
        onClick={() => setMenu(false)}
      />
      <aside
        ref={sidebarRef}
        className={`sidebar ${menu ? "open" : ""}`}
        role={menu ? "dialog" : undefined}
        aria-modal={menu ? true : undefined}
        aria-label="Navegação do portal"
      >
        <button
          className="mobile-sidebar-close"
          aria-label="Fechar menu do portal"
          onClick={() => setMenu(false)}
        >
          <Icon name="X" size={19} />
        </button>
        <div className="sidebar-brand-row">
          <Brand light />
          <button
            className="sidebar-collapse"
            onClick={toggleCompact}
            aria-label={
              compact ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            aria-expanded={!compact}
            title={compact ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            <Icon name="Menu" size={17} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">
            <Icon name={admin ? "ShieldCheck" : "Building2"} />
          </span>
          <div>
            {admin ? "SR Service" : profile?.company || "Minha empresa"}
            <small>{admin ? "Área administrativa" : "Portal do cliente"}</small>
          </div>
          <Icon name="ChevronRight" size={15} />
        </div>
        <span className="nav-label">PRINCIPAL</span>
        <nav aria-label="Menu do portal">
          {links.map(([to, icon, label]) => (
            <NavLink
              key={to}
              to={to}
              end
              title={label}
              aria-label={label}
              data-tooltip={label}
            >
              <Icon name={icon} />
              <span className="nav-text">{label}</span>
            </NavLink>
          ))}
        </nav>
        <span className="nav-label">CONTA E SUPORTE</span>
        <nav aria-label="Conta e suporte">
          <NavLink
            to="/app/perfil"
            title="Meu perfil"
            aria-label="Meu perfil"
            data-tooltip="Meu perfil"
          >
            <Icon name="UserRound" />
            <span className="nav-text">Meu perfil</span>
          </NavLink>
          <NavLink
            to="/app/configuracoes"
            title="Preferências"
            aria-label="Preferências"
            data-tooltip="Preferências"
          >
            <Icon name="Settings2" />
            <span className="nav-text">Preferências</span>
          </NavLink>
          <NavLink
            to="/app/ajuda"
            title="Central de ajuda"
            aria-label="Central de ajuda"
            data-tooltip="Central de ajuda"
          >
            <Icon name="CircleHelp" />
            <span className="nav-text">Central de ajuda</span>
          </NavLink>
        </nav>
        <div className="sidebar-help">
          <Icon name="MessagesSquare" />
          <strong>Sua operação não pode parar.</strong>
          <p>Conte com nossa equipe para encontrar a solução certa.</p>
          <Link to="/contato">
            Fale com a SR Service <Icon name="ArrowUpRight" size={15} />
          </Link>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{initials}</span>
          <div>
            <strong>{profile?.full_name || "Minha conta"}</strong>
            <small>{admin ? "Administrador" : "Cliente"}</small>
          </div>
          <button onClick={exit} aria-label="Sair da conta">
            <Icon name="LogOut" size={19} />
          </button>
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-header">
          <div className="breadcrumb">
            <button
              className="menu-toggle icon-button"
              aria-label="Abrir menu do portal"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name="Menu" />
            </button>
            <span>Portal {admin ? "administrativo" : "do cliente"}</span>
            <Icon name="ChevronRight" size={14} />
            <strong>{currentPage}</strong>
          </div>
          <div className="portal-header-right">
            <ThemeToggle />
            <Link to="/" className="text-link">
              Visitar site <Icon name="ArrowUpRight" size={14} />
            </Link>
            <span className="separator" />
            <span className="avatar small">{initials}</span>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <Icon name="AlertCircle" size={15} />
            <span>
              Ambiente de demonstração · Dados fictícios salvos apenas neste
              navegador.
            </span>
            <button onClick={exit}>
              Sair da demonstração <Icon name="ArrowRight" size={14} />
            </button>
          </div>
        )}
        <main id="main-content" className="portal-content">
          <ErrorBox>{error || logoutError}</ErrorBox>
          <Outlet context={{ user, profile }} />
        </main>
        <div className="portal-bottom">
          <span>© {new Date().getFullYear()} SR Service</span>
          <span>
            <Icon name="ShieldCheck" size={13} /> Seu espaço de atendimento
            industrial
          </span>
        </div>
      </div>
    </div>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="small-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Empty({
  title = "Nenhum orçamento por aqui",
  text = "Sua próxima solução começa com uma solicitação.",
  action = true,
}) {
  return (
    <div className="empty">
      <span>
        <Icon name="Files" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <ButtonLink to="/app/novo-orcamento">
          <Icon name="Plus" size={17} />
          Solicitar orçamento
        </ButtonLink>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          <Icon name="X" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
