import { validateQuote, validateProfile } from "./domain";
import {
  ensureProfile,
  listQuotes,
  getQuote,
  createQuote,
  updateQuote,
} from "./firebase-data";
export { configured } from "./firebase";
const key = "sr-service-demo-v2";
const demoCustomer = {
  id: "demo-customer",
  full_name: "Mariana Oliveira",
  company: "Indústria Horizonte",
  phone: "11987654321",
  email: "mariana@exemplo.com",
  document: "",
  address: "Av. Industrial, 1200 — São Paulo, SP",
};
export const demoProfile = (role) =>
  role === "admin"
    ? {
        ...demoCustomer,
        id: "demo-admin",
        full_name: "Rafael Santos",
        company: "SR Service",
        email: "rafael@exemplo.com",
      }
    : { ...demoCustomer };
function seed() {
  return [
    {
      id: "demo-1",
      number: 1048,
      service: "Manutenção preventiva e corretiva",
      equipment: "Ponte rolante · 10 toneladas",
      description:
        "Inspeção preventiva dos mecanismos de elevação, verificação dos freios e lubrificação dos componentes da ponte rolante do galpão principal.",
      status: "Em análise",
      created_at: "2026-10-22T13:30:00Z",
      amount: null,
    },
    {
      id: "demo-2",
      number: 1047,
      service: "Peças e componentes",
      equipment: "Talha elétrica · 5 toneladas",
      description:
        "Solicitação de fornecimento e substituição do conjunto de freios da talha elétrica. Equipamento disponível para avaliação técnica.",
      status: "Proposta enviada",
      created_at: "2026-10-19T10:00:00Z",
      amount: 4850,
    },
    {
      id: "demo-3",
      number: 1039,
      service: "Inspeções e laudos técnicos",
      equipment: "Ponte rolante · 20 toneladas",
      description:
        "Inspeção técnica completa da estrutura e dos componentes de movimentação de cargas do galpão de produção.",
      status: "Concluído",
      created_at: "2026-10-10T14:00:00Z",
      amount: 3200,
    },
    {
      id: "demo-4",
      number: 1035,
      service: "Modernização de equipamentos",
      equipment: "Painel de comando · ponte rolante",
      description:
        "Modernização do painel e dos acionamentos da ponte rolante, com avaliação dos componentes existentes e das necessidades de operação.",
      status: "Em execução",
      created_at: "2026-10-07T09:00:00Z",
      amount: 12700,
    },
  ].map((q) => ({
    ...q,
    user_id: demoCustomer.id,
    company: demoCustomer.company,
    contact_name: demoCustomer.full_name,
    email: demoCustomer.email,
    phone: demoCustomer.phone,
    address: demoCustomer.address,
    urgency: "Planejado",
    notes: "",
    events: [
      { id: `${q.id}-received`, status: "Recebido", created_at: q.created_at },
      ...(q.status !== "Recebido"
        ? [
            {
              id: `${q.id}-current`,
              status: q.status,
              created_at: new Date(
                new Date(q.created_at).getTime() + 3600000,
              ).toISOString(),
            },
          ]
        : []),
    ],
  }));
}
function readDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.quotes && Array.isArray(saved.quotes)) return saved;
  } catch {
    /* recover invalid demo storage */
  }
  return { quotes: seed(), profiles: {} };
}
function writeDemo(data) {
  localStorage.setItem(key, JSON.stringify(data));
}
export function friendly(error) {
  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/email-already-in-use":
      "Este e-mail já está cadastrado. Entre ou recupere sua senha.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/weak-password": "Escolha uma senha de pelo menos 8 caracteres.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed":
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
    "auth/requires-recent-login":
      "Por segurança, saia e entre novamente antes de alterar a senha.",
    "auth/expired-action-code":
      "Este link expirou. Solicite um novo link por e-mail.",
    "auth/invalid-action-code":
      "Este link é inválido ou já foi utilizado. Solicite um novo.",
    "auth/unauthorized-domain":
      "Este domínio precisa ser autorizado no Firebase Authentication.",
    "auth/popup-closed-by-user":
      "A janela de login foi fechada. Tente novamente quando quiser.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela de login. Permita pop-ups deste site e tente novamente.",
    "auth/operation-not-allowed":
      "Este provedor de login precisa ser habilitado no Firebase Authentication.",
    "auth/account-exists-with-different-credential":
      "Este e-mail já usa outro método de acesso. Entre pelo método original.",
    "permission-denied":
      "Acesso não autorizado. Verifique sua conta e as regras do Firestore.",
    unavailable:
      "O serviço está indisponível. Verifique sua conexão e tente novamente.",
    "failed-precondition":
      "O Firestore precisa do índice configurado no projeto. Consulte o responsável pelo sistema.",
  };
  return (
    messages[error?.code] ||
    error?.message ||
    "Não foi possível concluir. Tente novamente."
  );
}
export const api = {
  async quote(user, demo, admin, id) {
    if (demo)
      return (
        readDemo().quotes.find(
          (q) => q.id === id && (admin || q.user_id === user.id),
        ) || null
      );
    return getQuote(id);
  },
  async profile(user, demo) {
    if (demo)
      return { ...demoProfile(demo), ...(readDemo().profiles[user.id] || {}) };
    return ensureProfile(user);
  },
  async quotes(user, demo, admin) {
    if (demo)
      return readDemo().quotes.filter((q) => admin || q.user_id === user.id);
    return listQuotes(user, admin);
  },
  async createQuote(user, demo, payload, operationId) {
    payload = Object.fromEntries(
      [
        "service",
        "equipment",
        "description",
        "urgency",
        "company",
        "contact_name",
        "email",
        "phone",
        "address",
      ].map((key) => [key, payload[key]]),
    );
    validateQuote(payload);
    if (demo) {
      const data = readDemo();
      const existing = operationId
        ? data.quotes.find((q) => q.id === operationId && q.user_id === user.id)
        : null;
      if (existing) {
        if (
          Object.entries(payload).every(
            ([key, value]) => existing[key] === value,
          )
        )
          return existing;
        throw new Error(
          "Este envio já foi registrado com outros dados. Inicie uma nova solicitação.",
        );
      }
      const now = new Date().toISOString();
      const quote = {
        ...payload,
        id: operationId || crypto.randomUUID(),
        number: Math.max(1048, ...data.quotes.map((q) => q.number)) + 1,
        user_id: user.id,
        status: "Recebido",
        created_at: now,
        amount: null,
        notes: "",
        events: [
          { id: crypto.randomUUID(), status: "Recebido", created_at: now },
        ],
      };
      data.quotes.unshift(quote);
      writeDemo(data);
      return quote;
    }
    return createQuote(user, payload, operationId);
  },
  async saveProfile(user, demo, profile) {
    validateProfile(profile);
    const payload = Object.fromEntries(
      ["full_name", "company", "phone", "document", "address"].map((k) => [
        k,
        profile[k] || "",
      ]),
    );
    if (demo) {
      const data = readDemo();
      data.profiles[user.id] = payload;
      writeDemo(data);
      return { ...profile, ...payload };
    }
    return ensureProfile(user, payload);
  },
  async updateQuote(demo, id, payload, expectedRevision) {
    if (demo) {
      if (demo !== "admin") throw new Error("Acesso restrito à equipe.");
      const data = readDemo();
      const q = data.quotes.find((q) => q.id === id);
      if (!q) throw new Error("Orçamento não encontrado.");
      if (
        expectedRevision &&
        (q.revision || q.updated_at || q.created_at) !== expectedRevision
      )
        throw new Error(
          "Outro acesso atualizou este orçamento. Recarregue os dados.",
        );
      if (q.status !== payload.status)
        q.events.push({
          id: crypto.randomUUID(),
          status: payload.status,
          created_at: new Date().toISOString(),
        });
      Object.assign(q, payload);
      q.updated_at = new Date().toISOString();
      q.revision = crypto.randomUUID();
      writeDemo(data);
      return q;
    }
    return updateQuote(id, payload, expectedRevision);
  },
};
