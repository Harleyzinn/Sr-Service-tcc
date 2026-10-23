import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
const password = "ChatSeguro123!";
async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Entrar no portal", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
  await page.goto("/app/chat");
}
async function send(page, text) {
  await page
    .getByRole("textbox", { name: "Sua mensagem", exact: true })
    .fill(text);
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Sua mensagem", exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("log")).toContainText(text);
}
test("real chat delivers client/admin messages live, survives reload, isolates customers and prevents duplicate retries", async ({
  browser,
}) => {
  const app = initializeApp({ projectId: "demo-sr-service" }, "chat-live");
  const customerContext = await browser.newContext();
  const teamContext = await browser.newContext();
  const strangerContext = await browser.newContext();
  try {
    const auth = getAuth(app);
    const client = await auth.createUser({
      email: `chat-customer-${Date.now()}@example.com`,
      password,
      emailVerified: true,
      displayName: "Cliente Chat",
    });
    const staff = await auth.createUser({
      email: `chat-admin-${Date.now()}@example.com`,
      password,
      emailVerified: true,
      displayName: "Admin Chat",
    });
    const other = await auth.createUser({
      email: `chat-other-${Date.now()}@example.com`,
      password,
      emailVerified: true,
      displayName: "Outro Chat",
    });
    await auth.setCustomUserClaims(staff.uid, { admin: true });
    const customer = await customerContext.newPage();
    const admin = await teamContext.newPage();
    const stranger = await strangerContext.newPage();
    await login(customer, client.email);
    await send(customer, "Olá, preciso acompanhar meu atendimento.");
    await login(admin, staff.email);
    await admin
      .locator(".chat-inbox-list button")
      .filter({ hasText: "Cliente Chat" })
      .click();
    await expect(admin.getByRole("log")).toContainText(
      "Olá, preciso acompanhar meu atendimento.",
    );
    await send(admin, "Olá! A equipe está verificando sua solicitação.");
    await expect(customer.getByRole("log")).toContainText(
      "Olá! A equipe está verificando sua solicitação.",
    );
    await login(stranger, other.email);
    await stranger.goto(`/app/chat?conversa=${client.uid}`);
    await expect(stranger.getByRole("log")).not.toContainText(
      "Olá, preciso acompanhar meu atendimento.",
    );
    const denied = await stranger.evaluate(async (uid) => {
      const { authClient } = await import("/src/firebase.js");
      const { chatRepository } = await import("/src/chat/repository.js");
      // A forged UI admin flag must still be rejected by the server's real token.
      const repo = chatRepository(
        { id: authClient.currentUser.uid },
        {},
        true,
        null,
      );
      return new Promise((resolve) => {
        let stop;
        const finish = (value) => {
          stop?.();
          resolve(value);
        };
        stop = repo.watchRoom(
          uid,
          (_, metadata) => {
            if (!metadata.cached) finish(false);
          },
          (error) => finish(error.code === "permission-denied"),
        );
      });
    }, client.uid);
    expect(denied).toBe(true);
    const retry = await customer.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      const { chatRepository } = await import("/src/chat/repository.js");
      const user = { id: authClient.currentUser.uid };
      const repo = chatRepository(
        user,
        { full_name: "Cliente Chat", company: "" },
        false,
        null,
      );
      await repo.send(
        user.id,
        "same-retry-operation",
        "Mensagem com repetição segura",
      );
      await repo.send(
        user.id,
        "same-retry-operation",
        "Mensagem com repetição segura",
      );
      return user.id;
    });
    expect(retry).toBe(client.uid);
    await expect(customer.locator(".chat-message")).toHaveCount(3);
    const second = await customerContext.newPage();
    await second.goto("/app/chat");
    await expect(second.locator(".chat-message")).toHaveCount(3);
    async function concurrent(page, id) {
      await page.evaluate(async (operationId) => {
        const { authClient } = await import("/src/firebase.js");
        const { chatRepository } = await import("/src/chat/repository.js");
        const user = { id: authClient.currentUser.uid };
        await chatRepository(user, {}, false, null).send(
          user.id,
          operationId,
          `Mensagem simultânea ${operationId}`,
        );
      }, id);
    }
    await Promise.all([
      concurrent(customer, "parallel-a"),
      concurrent(second, "parallel-b"),
    ]);
    await expect(admin.locator(".chat-message")).toHaveCount(5);
    await customer.reload();
    await expect(customer.locator(".chat-message")).toHaveCount(5);
    await customerContext.setOffline(true);
    await customer
      .getByRole("textbox", { name: "Sua mensagem", exact: true })
      .fill("Retomada após conexão");
    await expect(
      customer.getByRole("button", { name: "Enviar mensagem", exact: true }),
    ).toBeDisabled();
    await customerContext.setOffline(false);
    await customer
      .getByRole("button", { name: "Enviar mensagem", exact: true })
      .click();
    await expect(admin.locator(".chat-message")).toHaveCount(6);
    await admin.reload();
    await expect(admin.locator(".chat-message")).toHaveCount(6);
    const stored = await getFirestore(app)
      .collection("conversations")
      .doc(client.uid)
      .get();
    expect(stored.data().message_count).toBe(6);
  } finally {
    await Promise.all([
      customerContext.close(),
      teamContext.close(),
      strangerContext.close(),
    ]);
    await deleteApp(app);
  }
});

test("chat retrieves earlier saved history instead of silently limiting the conversation", async ({
  page,
}) => {
  const app = initializeApp({ projectId: "demo-sr-service" }, "chat-history");
  try {
    const client = await getAuth(app).createUser({
      email: `chat-history-${Date.now()}@example.com`,
      password,
      emailVerified: true,
      displayName: "Histórico Chat",
    });
    const root = getFirestore(app).collection("conversations").doc(client.uid);
    const origin = Date.now() - 100000;
    const batch = getFirestore(app).batch();
    for (let i = 0; i < 61; i++)
      batch.set(
        root
          .collection("messages")
          .doc(`history-${String(i).padStart(3, "0")}`),
        {
          sender_id: client.uid,
          sender_role: "customer",
          text: `Mensagem histórica ${i}`,
          created_at: Timestamp.fromMillis(origin + i * 1000),
        },
      );
    batch.set(root, {
      customer_id: client.uid,
      customer_name: "Histórico Chat",
      customer_company: "",
      created_at: Timestamp.fromMillis(origin),
      updated_at: Timestamp.fromMillis(origin + 60000),
      last_message_id: "history-060",
      last_text: "Mensagem histórica 60",
      last_sender_id: client.uid,
      last_sender_role: "customer",
      message_count: 61,
    });
    await batch.commit();
    await login(page, client.email);
    await expect(page.locator(".chat-message")).toHaveCount(50);
    await expect(page.getByRole("log")).not.toContainText(
      "Mensagem histórica 0",
    );
    await page
      .getByRole("button", {
        name: "Carregar mensagens anteriores",
        exact: true,
      })
      .click();
    await expect(page.locator(".chat-message")).toHaveCount(61);
    await expect(page.getByRole("log")).toContainText("Mensagem histórica 0");
    await expect(
      page.getByRole("button", {
        name: "Carregar mensagens anteriores",
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await deleteApp(app);
  }
});

test("simultaneous first messages create one conversation and retain both messages", async ({
  page,
  context,
}) => {
  const app = initializeApp(
    { projectId: "demo-sr-service" },
    "chat-first-race",
  );
  try {
    const client = await getAuth(app).createUser({
      email: `chat-race-${Date.now()}@example.com`,
      password,
      emailVerified: true,
      displayName: "Primeiro Chat",
    });
    await login(page, client.email);
    const second = await context.newPage();
    await second.goto("/app/chat");
    await expect(second.locator(".chat-connection")).toContainText("Conectado");
    const firstSend = (target, id) =>
      target.evaluate(async (operationId) => {
        const { authClient } = await import("/src/firebase.js");
        const { chatRepository } = await import("/src/chat/repository.js");
        const user = { id: authClient.currentUser.uid };
        await chatRepository(
          user,
          { full_name: "Primeiro Chat" },
          false,
          null,
        ).send(user.id, operationId, `Primeiro envio ${operationId}`);
      }, id);
    await Promise.all([
      firstSend(page, "first-a"),
      firstSend(second, "first-b"),
    ]);
    await expect(page.locator(".chat-message")).toHaveCount(2);
    await page.reload();
    await expect(page.locator(".chat-message")).toHaveCount(2);
    expect(
      (
        await getFirestore(app)
          .collection("conversations")
          .doc(client.uid)
          .get()
      ).data().message_count,
    ).toBe(2);
    await second.close();
  } finally {
    await deleteApp(app);
  }
});
