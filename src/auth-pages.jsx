import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { configured, friendly } from "./api";
import {
  login,
  register,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  loginGoogle,
} from "./firebase-auth";
import { useAuth } from "./auth";
import { ThemeToggle } from "./theme";
import { digits, validateProfile } from "./domain";
import { Brand, ErrorBox, Eyebrow, Field, Icon, SuccessBox } from "./ui";
export function AuthPage({ mode = "login" }) {
  const { user, loading, startDemo, error: sessionError } = useAuth();
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const target = location.state?.from?.startsWith("/app")
    ? location.state.from
    : "/app";
  useEffect(() => {
    setError("");
    setSuccess("");
    setCanResend(false);
  }, [mode]);
  if (user && !loading && mode === "login")
    return <Navigate to={target} replace />;
  const titles = {
    login: [
      "BEM-VINDO DE VOLTA",
      "Sua operação, conectada.",
      "Entre para solicitar e acompanhar seus orçamentos.",
    ],
    register: [
      "SEU PRÓXIMO PASSO",
      "Vamos começar?",
      "Crie sua conta e aproxime sua indústria da solução.",
    ],
    forgot: [
      "RECUPERE SEU ACESSO",
      "Esqueceu sua senha?",
      "Enviaremos um link para você criar uma nova senha.",
    ],
    reset: [
      "NOVO COMEÇO",
      "Defina sua nova senha.",
      "Escolha uma senha de pelo menos 8 caracteres.",
    ],
  };
  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!configured) {
      setError(
        "O acesso real precisa da configuração do Firebase. Você pode explorar o portal pela demonstração abaixo.",
      );
      return;
    }
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password);
        navigate(target, { replace: true });
      }
      if (mode === "register") {
        validateProfile(form);
        if (form.password !== form.confirm)
          throw new Error("As senhas precisam ser iguais.");
        await register(
          {
            email: form.email.trim(),
            full_name: form.full_name.trim(),
            phone: digits(form.phone),
            company: form.company.trim(),
          },
          form.password,
        );
        setSuccess(
          "Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre no portal.",
        );
      }
      if (mode === "forgot") {
        await requestPasswordReset(form.email.trim());
        setSuccess(
          "Se houver uma conta com esse e-mail, você receberá as instruções de recuperação. Confira também o spam.",
        );
      }
      if (mode === "reset") {
        if (form.password !== form.confirm)
          throw new Error("As senhas precisam ser iguais.");
        const code = new URLSearchParams(location.search).get("oobCode");
        await resetPassword(code, form.password);
        setSuccess("Senha atualizada. Entre novamente com sua nova senha.");
      }
    } catch (e) {
      setError(friendly(e));
      if (
        e.code === "auth/unverified-email" ||
        e.code === "registration/incomplete"
      )
        setCanResend(true);
    } finally {
      setBusy(false);
    }
  }
  const [eyebrow, title, description] = titles[mode];
  return (
    <div className="auth-layout">
      <aside className="auth-visual">
        <Brand light />
        <div className="auth-visual-copy">
          <Eyebrow>CRANES & COMPONENTS</Eyebrow>
          <h2>
            O seu próximo
            <br />
            movimento
            <br />
            <em>começa aqui.</em>
          </h2>
          <p>
            Expertise técnica e atendimento próximo.
            <br />
            Da primeira conversa à solução.
          </p>
          <div className="auth-feature">
            <Icon name="ShieldCheck" />
            <div>
              Segurança e transparência
              <small>Acompanhe cada etapa do atendimento.</small>
            </div>
          </div>
        </div>
        <small>SR SERVICE · ENGENHARIA EM MOVIMENTO</small>
      </aside>
      <main id="main-content" className="auth-form-area">
        <div className="auth-top">
          <ThemeToggle />
          <Link to="/" className="text-link">
            <Icon name="ArrowLeft" size={16} />
            Voltar ao site
          </Link>
          <span>
            Precisa de ajuda? <Link to="/contato">Fale conosco</Link>
          </span>
        </div>
        <div className={`auth-form ${mode === "register" ? "register" : ""}`}>
          <div className="mobile-brand">
            <Brand />
          </div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p>{description}</p>
          <ErrorBox>{error || sessionError}</ErrorBox>
          {mode === "login" && (
            <>
              <button
                className="button secondary full google-login"
                disabled={busy || loading}
                onClick={async () => {
                  setError("");
                  if (!configured) {
                    setError(
                      "O login Google precisa da configuração do Firebase.",
                    );
                    return;
                  }
                  setBusy(true);
                  try {
                    await loginGoogle();
                    navigate(target, { replace: true });
                  } catch (e) {
                    setError(friendly(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <span aria-hidden="true" className="google-letter">
                  G
                </span>
                Continuar com Google
              </button>
              <div className="auth-divider">
                <span />
                ou entre com seu e-mail
                <span />
              </div>
            </>
          )}
          {canResend && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resendVerification();
                  setSuccess(
                    "Confirmação reenviada. Confira sua caixa de entrada.",
                  );
                  setError("");
                  setCanResend(false);
                } catch (e) {
                  setError(friendly(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reenviar confirmação
            </button>
          )}
          {success && <SuccessBox>{success}</SuccessBox>}
          {!success && (
            <form onSubmit={submit} key={mode}>
              {mode === "register" && (
                <>
                  <Field
                    label="Nome completo"
                    name="full_name"
                    placeholder="Seu nome e sobrenome"
                    autoComplete="name"
                    required
                    minLength={3}
                    maxLength={120}
                  />
                  <Field
                    label="Empresa"
                    name="company"
                    placeholder="Nome da sua empresa"
                    autoComplete="organization"
                    maxLength={160}
                  />
                  <Field
                    label="Telefone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    maxLength={20}
                    required
                  />
                </>
              )}
              {mode !== "reset" && (
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  placeholder="voce@empresa.com.br"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              )}{" "}
              {mode !== "forgot" && (
                <Field
                  label={mode === "reset" ? "Nova senha" : "Senha"}
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Digite sua senha"
                      : "Pelo menos 8 caracteres"
                  }
                  minLength={mode === "login" ? 1 : 8}
                  maxLength={128}
                  required
                />
              )}
              {(mode === "register" || mode === "reset") && (
                <Field
                  label="Confirmar senha"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita sua senha"
                  minLength={8}
                  required
                />
              )}
              {mode === "login" && (
                <div className="auth-options">
                  <span>
                    <Icon name="LockKeyhole" size={13} />
                    Acesso protegido
                  </span>
                  <Link to="/recuperar-senha">Esqueci minha senha</Link>
                </div>
              )}
              {mode === "register" && (
                <label className="checkbox">
                  <input name="consent" type="checkbox" required />
                  <span>
                    Li e concordo com as informações de{" "}
                    <Link to="/privacidade">privacidade e uso de dados</Link>.
                  </span>
                </label>
              )}
              <button className="button full" disabled={busy}>
                {busy ? (
                  <>
                    <Icon name="LoaderCircle" className="spin" />
                    Aguarde…
                  </>
                ) : (
                  <>
                    {mode === "login"
                      ? "Entrar no portal"
                      : mode === "register"
                        ? "Criar minha conta"
                        : mode === "forgot"
                          ? "Enviar link de recuperação"
                          : "Atualizar senha"}
                    <Icon name="ArrowRight" size={18} />
                  </>
                )}
              </button>
            </form>
          )}
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
              </>
            ) : (
              <Link to="/login">Voltar para o login</Link>
            )}
          </div>
          {mode === "login" && (
            <div className="demo-box">
              <div className="demo-box-title">
                <Icon name="LayoutDashboard" size={18} />
                <strong>Conheça o novo portal</strong>
                <span>DEMO</span>
              </div>
              <p>Explore os recursos com dados fictícios, sem cadastro.</p>
              <div>
                <button
                  className="button secondary"
                  onClick={() => {
                    startDemo("customer");
                    navigate(target);
                  }}
                >
                  Sou cliente <Icon name="ArrowRight" size={16} />
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    startDemo("admin");
                    navigate("/app");
                  }}
                >
                  Visão da equipe <Icon name="ArrowUpRight" size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="auth-bottom">
          <span>© {new Date().getFullYear()} SR Service</span>
          <Link to="/privacidade">Privacidade</Link>
        </div>
      </main>
    </div>
  );
}
