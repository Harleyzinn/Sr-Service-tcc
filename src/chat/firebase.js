import { getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { configured } from "../firebase";
// The full SDK is loaded only by the chat, for live listeners. Default cache is memory-only.
export const chatDb = configured ? getFirestore(getApp()) : null;
if (
  chatDb &&
  import.meta.env.DEV &&
  import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true"
)
  connectFirestoreEmulator(chatDb, "127.0.0.1", 8080);
