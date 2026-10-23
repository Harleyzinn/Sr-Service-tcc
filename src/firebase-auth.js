import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { authClient } from "./firebase";
import { ensureProfile } from "./firebase-data";
export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(authClient, provider);
  return result.user;
}
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(
    authClient,
    email,
    password,
  );
  if (!user.emailVerified)
    throw Object.assign(
      new Error(
        "Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.",
      ),
      { code: "auth/unverified-email" },
    );
  return user;
}
export async function register(fields, password) {
  const { user } = await createUserWithEmailAndPassword(
    authClient,
    fields.email,
    password,
  );
  try {
    await updateProfile(user, { displayName: fields.full_name });
    await ensureProfile(user, {
      full_name: fields.full_name,
      phone: fields.phone,
      company: fields.company,
    });
    await sendEmailVerification(user, {
      url: `${window.location.origin}/login`,
    });
  } catch (error) {
    throw Object.assign(
      new Error(
        "A conta foi criada, mas não foi possível concluir o perfil ou enviar a confirmação. Entre com suas credenciais para reenviar a confirmação e completar os dados. " +
          error.message,
      ),
      { code: "registration/incomplete" },
    );
  }
}
export async function resendVerification() {
  if (!authClient.currentUser)
    throw new Error(
      "Informe seu e-mail e senha e tente entrar antes de reenviar a confirmação.",
    );
  await sendEmailVerification(authClient.currentUser, {
    url: `${window.location.origin}/login`,
  });
}
export async function requestPasswordReset(email) {
  try {
    await sendPasswordResetEmail(authClient, email, {
      url: `${window.location.origin}/login`,
    });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
}
export async function resetPassword(code, password) {
  if (!code)
    throw new Error(
      "Abra o link de recuperação recebido por e-mail. Se ele expirou, solicite um novo.",
    );
  await verifyPasswordResetCode(authClient, code);
  await confirmPasswordReset(authClient, code, password);
  if (authClient.currentUser) await signOut(authClient);
}
export async function changePassword(password) {
  if (!authClient.currentUser)
    throw new Error("Entre novamente para alterar sua senha.");
  await updatePassword(authClient.currentUser, password);
}
