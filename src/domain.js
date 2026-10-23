export const statuses = [
  "Recebido",
  "Em análise",
  "Proposta enviada",
  "Aprovado",
  "Em execução",
  "Concluído",
  "Cancelado",
];
export const services = [
  {
    id: "manutencao",
    title: "Manutenção preventiva e corretiva",
    short: "Manutenção",
    icon: "Wrench",
    text: "Mais disponibilidade. Menos imprevistos. Cuidado técnico para manter sua operação em movimento.",
    items: [
      "Diagnóstico mecânico e elétrico",
      "Planos de manutenção preventiva",
      "Correção de falhas e substituição de componentes",
    ],
    image: "1.jpg",
  },
  {
    id: "retrofit",
    title: "Modernização de equipamentos",
    short: "Modernização e retrofit",
    icon: "Zap",
    text: "Uma nova vida para seus equipamentos, com atualização dos sistemas e melhoria da operação.",
    items: [
      "Atualização de comandos e painéis",
      "Modernização de sistemas de acionamento",
      "Avaliação técnica do equipamento existente",
    ],
    image: "2.jpg",
  },
  {
    id: "inspecao",
    title: "Inspeções e laudos técnicos",
    short: "Inspeções técnicas",
    icon: "ClipboardCheck",
    text: "Entenda a condição dos seus equipamentos e planeje as próximas intervenções com clareza.",
    items: [
      "Inspeção de estruturas e componentes",
      "Avaliação das condições de operação",
      "Relatórios e recomendações técnicas",
    ],
    image: "3.jpg",
  },
  {
    id: "montagem",
    title: "Montagem e instalação",
    short: "Montagem e instalação",
    icon: "HardHat",
    text: "Planejamento e precisão em cada etapa da instalação de equipamentos de elevação.",
    items: [
      "Montagem de pontes rolantes",
      "Instalação de talhas e acessórios",
      "Verificação e acompanhamento da partida",
    ],
    image: "4.jpg",
  },
  {
    id: "pecas",
    title: "Peças e componentes",
    short: "Peças e componentes",
    icon: "Settings2",
    text: "Os componentes certos para a necessidade da sua operação, com orientação na especificação.",
    items: [
      "Componentes mecânicos e elétricos",
      "Peças de reposição multimarcas",
      "Auxílio na identificação e especificação",
    ],
    image: "2.jpg",
  },
  {
    id: "consultoria",
    title: "Consultoria técnica",
    short: "Consultoria técnica",
    icon: "MessagesSquare",
    text: "Uma visão especializada para encontrar a melhor solução para seu desafio industrial.",
    items: [
      "Avaliação de necessidades da operação",
      "Planejamento de melhorias",
      "Orientação técnica para projetos especiais",
    ],
    image: "4.jpg",
  },
];
export const digits = (value) => String(value || "").replace(/\D/g, "");
export function validDocument(value) {
  const n = digits(value);
  if (![11, 14].includes(n.length) || /^(\d)\1+$/.test(n)) return false;
  const check = (base, weights) => {
    const mod =
      [...base].reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0) %
      11;
    return mod < 2 ? 0 : 11 - mod;
  };
  if (n.length === 11)
    return (
      check(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(n[9]) &&
      check(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(n[10])
    );
  return (
    check(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(n[12]) &&
    check(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(n[13])
  );
}
export function validateProfile(p) {
  if (!p.full_name?.trim().includes(" "))
    throw new Error("Informe seu nome e sobrenome.");
  if (digits(p.phone).length < 10 || digits(p.phone).length > 11)
    throw new Error("Informe um telefone com DDD válido.");
  if (p.document && !validDocument(p.document))
    throw new Error("Informe um CPF ou CNPJ válido.");
}
export function validateQuote(q) {
  if (!services.some((s) => s.title === q.service))
    throw new Error("Selecione o serviço.");
  if (!q.equipment?.trim()) throw new Error("Informe o equipamento.");
  if (q.description?.trim().length < 20)
    throw new Error("Descreva a necessidade em pelo menos 20 caracteres.");
  if (!q.company?.trim() || !q.contact_name?.trim())
    throw new Error("Preencha empresa e nome do contato.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email || ""))
    throw new Error("Informe um e-mail válido.");
  if (digits(q.phone).length < 10 || digits(q.phone).length > 11)
    throw new Error("Informe um telefone com DDD válido.");
  if (!q.address?.trim()) throw new Error("Informe o endereço do atendimento.");
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "—";
export const money = (value) =>
  value == null
    ? "A definir"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
export const reference = (q) => `SR-${String(q.number).padStart(4, "0")}`;
export function filterQuotes(quotes, search, status) {
  const term = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return quotes.filter(
    (q) =>
      (!status || q.status === status) &&
      [reference(q), q.service, q.company, q.equipment, q.contact_name]
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(term),
  );
}
