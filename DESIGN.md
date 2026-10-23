# Redesign SR Service — grafite e amarelo industrial

A paleta foi recuperada dos arquivos originais preservados em `legacy/style.css` e `legacy/admin.css`, disponíveis no histórico do repositório: cabeçalho `#1A1A1A`, cards administrativos `#2A2A2A`, botões/bordas `#F0C029`, navegação `#FFCC00`, fundo claro `#F4F4F4` e textos `#333333`. Esses arquivos permanecem intactos.

| Papel | Paleta aplicada |
| --- | --- |
| Identidade e ações | `#F0C029`, com destaque `#FFCC00` |
| Grafite original | `#1A1A1A` |
| Fundo claro | `#F5F5F2` |
| Superfície clara | `#FFFFFF` / `#FAFAF8` |
| Texto claro | `#242522`, secundário `#6B6E66` |
| Fundo escuro | `#151614` |
| Superfície escura | `#1E201C` / `#252721` |
| Texto escuro | `#F0F1E9`, secundário `#B1B4A8` |

As superfícies têm um aquecimento discreto e os acentos claros usam `#FBF4D8`. O amarelo é reservado para ações e seleção; erros, confirmações, entradas e despesas conservam distinção semântica. O azul e o laranja da interface anterior foram substituídos nas folhas globais e locais do financeiro/chat. Fotos existentes foram mantidas.

## Sistema visual

`src/design-system.css` centraliza tokens de cor, escala tipográfica, espaços de 4–48 px, raios de 8/16/22 px, sombras, foco e movimento. Os nomes `--navy` e `--orange` são aliases de compatibilidade com componentes existentes, sem manter a paleta azul/laranja. Os estilos estruturais das rotas permanecem em suas folhas locais; o sistema global define o acabamento comum. O CSS usa seletores que conservam a precedência frente ao carregamento tardio das rotas.

- Sidebar grafite, grupos separados, seleção amarela e controle para recolher/expandir no desktop. A escolha fica somente neste navegador; falha de armazenamento não impede o uso. Links conservam nomes acessíveis, foco e tooltips em modo compacto. No celular, o menu abre completo e preserva Escape, foco e bloqueio de rolagem.
- Cabeçalho com o nome real da tela atual; dashboard recomposto com área de boas-vindas, fotografia discreta e atalhos reais de conversa/financeiro, seguidos dos indicadores e do fluxo de atendimento.
- Indicadores com números tabulares e ícones consistentes; cartão de saldo destacado, abas em controle segmentado, gráfico com grade, cores de entradas/gastos e seleção de período.
- Tabelas, filtros, cards móveis, detalhes de pedidos, perfil, histórico anterior, preferências, ajuda, formulários, mensagens, modais e toasts com superfícies, raios e hierarquia comuns.
- Chat com bolhas próprias/recebidas distintas, caixa administrativa e compositor integrados ao tema; páginas públicas e autenticação com fotografia industrial, composição editorial e ações amarelas.
- Microinterações curtas, animação de entrada e transições de navegação. `prefers-reduced-motion` desativa movimento não essencial. Campos móveis usam fonte de 16 px para evitar zoom involuntário.

## Verificação

Testes existentes cobrem pedidos, perfil, rascunhos, financeiro, parcelas, recorrências, importação/exportação, temas, chat, autenticação e persistência com SDKs Firebase nos emuladores. Os novos testes `tests/e2e/design.spec.js` exercitam navegação compacta persistente, teclado, retorno ao menu móvel e ausência de rolagem horizontal em 360 e 768 px: dez telas públicas/autenticação e dez telas do portal, estas nos dois temas, com movimento reduzido. Capturas adicionais em 390 e 1440 px permitem revisão de composição, cards, formulários e chat.

Capturas ficam em `artifacts/`, ignorado pelo Git. `scripts/capture.mjs`, `scripts/capture-finance.mjs` e `scripts/capture-chat.mjs` usam somente demonstrações locais. Não gravam dados de demonstração no Firebase. Essa verificação não equivale a auditoria formal de WCAG, testes em todos os navegadores ou certificação de todos os contrastes possíveis.

Nenhuma regra financeira, coleção, autorização, autenticação ou sincronização foi modificada por este redesign. A publicação requer somente o build do frontend e Firebase Hosting; não requer reimplantar as regras ou índices.
