# Auditoria e plano de evolução — 23/10/2026

## Estado encontrado antes das alterações

- React 19, React Router 7 e Vite 6, JavaScript; CSS global, fontes locais e ícones Lucide. Hospedagem estática com fallback de rotas.
- Rotas públicas: início, empresa, serviços, contato, privacidade, autenticação e handler de e-mail. Rotas protegidas: painel, pedidos, detalhes, novo pedido, perfil, ajuda e clientes (equipe).
- `auth.jsx` mantém sessão e custom claims; `firebase-auth.js` autentica; `firebase-data.js` consulta/grava dados; `api.js` contém adaptador real e demonstração explicitamente separada. `portal.jsx` concentra muitas responsabilidades. Domínio e rascunhos já possuem testes.
- Firestore: `profiles/{uid}` e `quotes/{id}`. Eventos fazem parte do pedido, com regras de histórico imutável. Perfis são privados; administradores acessam atendimentos. Não existe financeiro, livro-caixa, cartões, contas bancárias ou integração bancária. Valores de proposta não podem ser tratados como receita.
- Demonstração utiliza localStorage e rascunhos sessionStorage, sem comunicação de dados fictícios para produção. Original preservado em `legacy/`, fora do build.
- Não há `.env` preenchido nesta cópia. Produção, entrega real de e-mails, domínios e índices externos não podem ser certificados nesta sessão.

## Problemas e oportunidades priorizados

1. **Integridade:** atualizações simultâneas de propostas podem sobrescrever trabalho sem aviso; envio repetido após resposta de rede perdida pode criar outro pedido. Fortalecer controle de versão e identidade da operação.
2. **Financeiro ausente:** implementar um módulo isolado por usuário, sem migrar nem reinterpretar dados industriais. Valores em centavos inteiros, transferências únicas e recorrências determinísticas evitam erros de saldo e duplicação.
3. **Autenticação:** somente e-mail/senha; adicionar Google com erros compreensíveis. Renovação de token atual desmonta telas protegidas e pode interromper edição.
4. **Escala:** listagem de pedidos carrega todos os documentos e pagina somente no navegador. A UI e serviços são carregados antecipadamente. Aplicar divisão por rotas e documentar limites remanescentes de consultas globais; não truncar relatórios silenciosamente.
5. **UX:** falta tema escuro e preferências sincronizadas. Não há central financeira, projeções, alertas ou categorias de caixa. Preservar navegação acessível existente.
6. **Offline:** Firestore Lite não oferece fila de escrita offline. Não habilitar cache persistente de informações financeiras em computador compartilhado sem escolha explícita. Permitir rascunhos locais e informar indisponibilidade; não mostrar confirmação de escrita sem resposta do servidor.
7. **Recuperação:** exportação CSV existente não é backup restaurável. Fornecer exportação estruturada dos novos registros e procedimento operacional para backup do projeto, sem executar ações pagas em produção.

## Plano e dependências

P0: domínio financeiro e regras por proprietário, validação, idempotência e concorrência. P1: financeiro utilizável de ponta a ponta (contas, lançamentos, recorrências, transferências, limites e previsões), testes em emulador. P2: dashboard financeiro, preferências/tema, Google e carregamento sob demanda. P3: documentação de implantação, medições e limitações.

Novas coleções serão aditivas e restritas ao UID, inclusive para administradores do atendimento. Nenhum documento atual será removido ou migrado automaticamente. Regras e índices só serão publicados no emulador; configuração e implantação reais permanecem externas. Não serão criados serviços pagos ou chaves de terceiros.

As previsões usarão somente registros e regras cadastrados pelo usuário. Sem IA externa, pagamentos bancários, notificações push ou agendador em nuvem nesta etapa. As ocorrências futuras de recorrência serão calculadas; a confirmação de pagamento persiste uma ocorrência determinística, sem disparo ou cobrança automática.
