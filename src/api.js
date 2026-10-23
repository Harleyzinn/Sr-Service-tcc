import { createClient } from "@supabase/supabase-js";
import { validateQuote, validateProfile } from "./domain";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const supabase = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null;
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
function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}
export function friendly(error) {
  const text = error?.message || "Não foi possível concluir. Tente novamente.";
  if (/Invalid login credentials/i.test(text))
    return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(text))
    return "Confirme seu e-mail antes de entrar.";
  if (/rate limit/i.test(text))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (/fetch|network/i.test(text))
    return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
  if (/relation|schema cache/i.test(text))
    return "O banco ainda precisa ser configurado com a migração do projeto.";
  return text;
}
export const api = {
  async profile(user, demo) {
    if (demo)
      return { ...demoProfile(demo), ...(readDemo().profiles[user.id] || {}) };
    return unwrap(
      await supabase.from("sr_profiles").select("*").eq("id", user.id).single(),
    );
  },
  async quotes(user, demo, admin) {
    if (demo)
      return readDemo().quotes.filter((q) => admin || q.user_id === user.id);
    let query = supabase
      .from("sr_quotes")
      .select("*, events:sr_quote_events(*)")
      .order("created_at", { ascending: false });
    if (!admin) query = query.eq("user_id", user.id);
    return unwrap(await query);
  },
  async createQuote(user, demo, payload) {
    validateQuote(payload);
    if (demo) {
      const data = readDemo();
      const now = new Date().toISOString();
      const quote = {
        ...payload,
        id: crypto.randomUUID(),
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
    return unwrap(
      await supabase
        .from("sr_quotes")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single(),
    );
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
    return unwrap(
      await supabase
        .from("sr_profiles")
        .update(payload)
        .eq("id", user.id)
        .select()
        .single(),
    );
  },
  async updateQuote(demo, id, payload) {
    if (demo) {
      if (demo !== "admin") throw new Error("Acesso restrito à equipe.");
      const data = readDemo();
      const q = data.quotes.find((q) => q.id === id);
      if (!q) throw new Error("Orçamento não encontrado.");
      if (q.status !== payload.status)
        q.events.push({
          id: crypto.randomUUID(),
          status: payload.status,
          created_at: new Date().toISOString(),
        });
      Object.assign(q, payload);
      writeDemo(data);
      return q;
    }
    return unwrap(
      await supabase
        .from("sr_quotes")
        .update(payload)
        .eq("id", id)
        .select()
        .single(),
    );
  },
};
