import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { applyActionCode, signOut } from "firebase/auth";
import { authClient, configured } from "./firebase";
import { friendly } from "./api";
import { AuthPage } from "./auth-pages";
import { ErrorBox, Loading, SuccessBox } from "./ui";
export function EmailAction() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const [state, setState] = useState({
    loading: mode === "verifyEmail",
    error: "",
    success: false,
  });
  useEffect(() => {
    let active = true;
    if (mode !== "verifyEmail") return;
    if (!configured || !code) {
      setState({
        loading: false,
        error: "Link de confirmação inválido ou Firebase não configurado.",
      });
      return;
    }
    applyActionCode(authClient, code)
      .then(() => signOut(authClient))
      .then(() => {
        if (active) setState({ loading: false, success: true });
      })
      .catch((e) => {
        if (active) setState({ loading: false, error: friendly(e) });
      });
    return () => {
      active = false;
    };
  }, [mode, code]);
  if (mode === "resetPassword") return <AuthPage mode="reset" />;
  return (
    <main id="main-content" className="container section legal">
      <h1>Confirmação de e-mail</h1>
      {state.loading ? (
        <Loading />
      ) : state.success ? (
        <SuccessBox>
          E-mail confirmado. Entre no portal com sua senha.
        </SuccessBox>
      ) : (
        <ErrorBox>
          {state.error ||
            "Este link não é válido. Solicite um novo e-mail de confirmação."}
        </ErrorBox>
      )}
      <Link className="button" to="/login">
        Voltar para o login
      </Link>
    </main>
  );
}
