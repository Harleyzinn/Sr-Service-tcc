import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const [projectId, email] = process.argv.slice(2);
if (!projectId || !email)
  throw new Error(
    "Uso: node scripts/set-admin.mjs ID_DO_PROJETO email@empresa.com.br",
  );
initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
console.log(
  "Permissão administrativa definida. Saia e entre novamente no portal para renovar o token.",
);
