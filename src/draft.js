const prefix = "sr-quote-draft-v1:";
export const draftKey = (userId, mode) =>
  `${prefix}${import.meta.env?.VITE_FIREBASE_PROJECT_ID || "local"}:${mode || "real"}:${userId}`;
export function readDraft(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (
      !saved ||
      saved.version !== 1 ||
      !Number.isFinite(saved.savedAt) ||
      Date.now() - saved.savedAt > 86400000 ||
      !saved.form ||
      typeof saved.form !== "object"
    ) {
      clearDraft(key);
      return null;
    }
    const allowed = [
      "service",
      "equipment",
      "description",
      "urgency",
      "company",
      "contact_name",
      "email",
      "phone",
      "address",
    ];
    const form = Object.fromEntries(
      allowed
        .filter((key) => typeof saved.form[key] === "string")
        .map((key) => [key, saved.form[key]]),
    );
    return {
      ...saved,
      form,
      step: saved.step === 2 || saved.step === 3 ? 2 : 1,
    };
  } catch {
    return null;
  }
}
export function saveDraft(key, form, step) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ version: 1, form, step, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearDraft(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* unavailable storage */
  }
}
export function clearUserDrafts(userId, mode) {
  try {
    const suffix = `:${mode || "real"}:${userId}`;
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(prefix) && key.endsWith(suffix))
      .forEach(clearDraft);
  } catch {
    /* unavailable storage */
  }
}
