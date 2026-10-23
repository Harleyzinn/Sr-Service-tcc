import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { AuthPage } from "./auth-pages";
import { EmailAction } from "./email-action";
import { About, Contact, Home, NotFound, Privacy, Services } from "./public";
import {
  Customers,
  Dashboard,
  Help,
  NewQuote,
  Profile,
  QuoteDetail,
  Quotes,
} from "./portal";
import {
  Loading,
  PortalLayout,
  PublicLayout,
  ScrollTop,
  ToastProvider,
} from "./ui";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "./styles.css";
function Protected({ adminOnly = false }) {
  const { user, loading, admin } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (adminOnly && !admin) return <Navigate to="/app" replace />;
  return <Outlet />;
}
function LegacyRedirect() {
  const paths = {
    "/index.html": "/",
    "/sobre_nos.html": "/sobre",
    "/servicos.html": "/servicos",
    "/cadastro.html": "/cadastro",
    "/recuperar_senha.html": "/recuperar-senha",
    "/perfil.html": "/app/perfil",
    "/orcamento.html": "/app/novo-orcamento",
    "/consultar_orcamento.html": "/app/orcamentos",
    "/admin.html": "/app",
    "/politica_privacidade.html": "/privacidade",
  };
  const { pathname } = useLocation();
  return paths[pathname] ? (
    <Navigate to={paths[pathname]} replace />
  ) : (
    <NotFound />
  );
}
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="empty">
          <h1>Não foi possível abrir esta página.</h1>
          <p>Recarregue para retomar o acesso ao portal.</p>
          <button
            className="button"
            onClick={() => window.location.assign("/")}
          >
            Voltar ao início
          </button>
        </main>
      );
    return this.props.children;
  }
}
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-link">
              Pular para o conteúdo
            </a>
            <ScrollTop />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="sobre" element={<About />} />
                <Route path="servicos" element={<Services />} />
                <Route path="contato" element={<Contact />} />
                <Route path="privacidade" element={<Privacy />} />
                <Route path="*" element={<LegacyRedirect />} />
              </Route>
              <Route path="login" element={<AuthPage />} />
              <Route path="acao-email" element={<EmailAction />} />
              <Route path="cadastro" element={<AuthPage mode="register" />} />
              <Route
                path="recuperar-senha"
                element={<AuthPage mode="forgot" />}
              />
              <Route
                path="redefinir-senha"
                element={<AuthPage mode="reset" />}
              />
              <Route element={<Protected />}>
                <Route path="app" element={<PortalLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="orcamentos" element={<Quotes />} />
                  <Route path="orcamentos/:id" element={<QuoteDetail />} />
                  <Route path="novo-orcamento" element={<NewQuote />} />
                  <Route path="perfil" element={<Profile />} />
                  <Route path="ajuda" element={<Help />} />
                  <Route element={<Protected adminOnly />}>
                    <Route path="clientes" element={<Customers />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
createRoot(document.getElementById("root")).render(<App />);
