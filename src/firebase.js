import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore/lite";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const configured = Object.values(config).every(Boolean);
const app = configured ? initializeApp(config) : null;
export const authClient = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
if (authClient) authClient.languageCode = "pt-BR";
// Emulator traffic is opt-in and restricted to development builds.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true" &&
  app
) {
  connectAuthEmulator(authClient, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
