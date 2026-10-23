# Evolução do SR Service — 23/10/2026

## Diagnóstico e decisão de arquitetura

A aplicação encontrada era um portal industrial de solicitações e propostas, com Authentication e Firestore, sem módulo financeiro. O diagnóstico anterior às mudanças está em `AUDIT.md`. A evolução foi aditiva: preserva as rotas, os pedidos, o histórico e os perfis; acrescenta um caixa privado por usuário. Propostas comerciais não viram receitas automaticamente.

Nenhum dado de produção foi removido, migrado, substituído por demonstração ou alterado. Não houve provisionamento pago, publicação de regras em produção ou implantação do site.

## Entregas implementadas

### Chat persistente com a equipe

- Rota protegida `/app/chat`, botão de entrada no site e menu por papel. Cliente tem uma conversa com a equipe; administradores têm caixa de atendimentos e seleção de cliente.
- Mensagens em tempo real no Firestore, com autor/data, histórico após recarga e carregamento anterior. Mensagem e resumo são transacionais, imutáveis pela API Web e protegidos por UID/claim. Repetições são idempotentes e envios simultâneos usam incremento atômico; disputa de criação tem repetição limitada mediante leitura autorizada.
- Interface para celular e temas, texto de até 4.000 caracteres, Ctrl/Cmd + Enter, envio bloqueado offline e texto preservado no campo em falha. Nenhum indicador falso de presença/leitura ou resposta automática.
- SDK completo do Firestore fica restrito ao módulo sob demanda, com cache somente em memória e listeners removidos ao sair. Os demais módulos mantêm Firestore Lite. Janela inicial de 50 mensagens e 25 conversas; expansão relê uma janela maior e deve entrar na avaliação de custos.
- Regras e testes cobrem isolamento, remetente falso, escritas incompletas, edição/exclusão, sessões de cliente/equipe, HTML literal, reconexão, repetição e histórico longo. Instruções e limites em `CHAT.md`. Produção ainda depende da publicação do build/regras e configuração real.

### Continuação: importação segura e consultas incrementais

- Importação CSV UTF-8 com validação estrita da codificação, limite de 1 MB/100 registros, conta de destino, modelo para download e prévia antes da confirmação. Parser aceita separadores vírgula/ponto e vírgula, aspas escapadas, quebras de linha e datas brasileiras/ISO.
- Erros bloqueiam o lote completo. Transferências e previsões virtuais de séries são recusadas; sem situação explícita, a importação assume previsão. IDs SHA-256 determinísticos evitam reimportação, preservam linhas idênticas legítimas do arquivo e não ressuscitam cancelamentos. Semelhanças com registros manuais exigem inclusão explícita.
- Prévia perde a validade se outro acesso atualizar o livro durante a conferência. Confirmação real bloqueada offline. Transação única para até 100 lançamentos; um conflito impede gravação parcial.
- Cache somente em memória, por instância/usuário; consultas posteriores buscam alterações por `updated_at`, mantendo Timestamp completo e fronteira inclusiva. Mesclagem versionada preserva o histórico. Consultas são serializadas e uma falha não avança cursores nem publica dados parciais. O botão Atualizar refaz a leitura integral.
- Atualização ao retornar à aba, reconectar e receber sinal de outra aba visível da mesma conta/origem. BroadcastChannel transmite apenas invalidação, sem valores financeiros. Eventos são agrupados; sinais durante uma gravação geram atualização posterior. A consulta em segundo plano preserva o formulário aberto e exibe horário da última confirmação.
- Medição no Firestore emulado: **601 documentos** na primeira consulta (600 lançamentos + 1 conta), **2** na seguinte sem mudanças e **4** após alteração de lançamento antigo e inclusão de outro. O total de registros e os saldos permanecem corretos. São documentos recebidos, não custos faturados: consultas vazias, transações e verificações de regras têm leituras adicionais/mínimas. Grupos com timestamps iguais podem ser relidos para não perder alterações.
- Importação e prévia conferidas visualmente em computador e celular. Modelo e detalhes de formato ficam disponíveis sem sobrecarregar a tela inicial.

### Caixa e planejamento

- Entradas, gastos, contas e cartões de controle manual; validação de campos, datas e valores em centavos inteiros. Opções avançadas expansíveis mantêm o cadastro rápido.
- Transferência com débito e crédito derivados de um único registro; consolidado conservado. Realizados, previstos e cancelados são tratados separadamente.
- Parcelamento de até 36 parcelas, total exato e criação atômica; somente a primeira parcela pode começar realizada.
- Livro e agenda mensal com busca, filtros, paginação visual, confirmação, cancelamento com confirmação e restauração como previsão. Registros não são apagados; valores e contas do lançamento persistido são imutáveis.
- Séries semanais, mensais e anuais editáveis, com pausa, retomada e encerramento por data. Calendário usa a data original como âncora, inclusive no último dia do mês e em anos bissextos.
- Ocorrências virtuais identificadas como previsão; confirmação persistente com identidade determinística impede repetição. Pausar/editar uma série não apaga os registros já gravados.
- Limites mensais por categoria e metas com progresso da reserva informada. Reservas não são somadas ou descontadas novamente nas contas.
- Painel com saldo consolidado, entradas/despesas mensais, comparação de gastos, gráfico interativo de seis meses e projeção de 30 dias. Filtro mensal na URL e widgets configuráveis.
- Alertas calculados: vencimentos, 80% ou mais do limite e gastos acima do dobro da mediana quando há histórico suficiente. Sem serviços externos de IA, envio de dados a modelos ou cobranças automáticas.
- Exportações CSV filtrada e JSON dos cinco conjuntos de dados financeiros persistidos. Células CSV recebem a mesma proteção contra fórmulas usada nos orçamentos.

### Firebase, segurança e confiabilidade

- Novas coleções `users/{uid}/{accounts,entries,series,budgets,goals}` com autorização pelo UID e e-mail confirmado. Administradores do atendimento não ganham acesso às finanças de outras contas.
- Regras validam schema, centavos inteiros, datas de calendário, referências das contas, transferências distintas, versões e correspondência da ocorrência à frequência/valor da série. Pagamento futuro é bloqueado pelo servidor, considerando UTC−03.
- Transações financeiras verificam versões e recusam alterações desatualizadas. Identidades estáveis permitem repetir operações sem duplicar registros; parcelas são gravadas em conjunto.
- Consulta compartilhada pelo Firestore ao carregar, atualizar e após gravar; reconexão solicita nova leitura. Erros não são apresentados como sucesso nem exibem totais parciais.
- Login Google implementado com popup e tratamento de provedor desabilitado, janela bloqueada/fechada e credenciais incompatíveis. E-mail, confirmação, recuperação e permissões anteriores permanecem.
- Renovação de token da mesma conta preserva o formulário aberto. Respostas assíncronas antigas de preferências e financeiro não substituem o estado de outra conta ou consulta mais recente.
- Pedidos usam identidade de operação persistida no rascunho, recuperando o mesmo pedido após tentativa repetida. Atualizações de propostas verificam revisão dentro da transação e oferecem recarga explícita.
- Demonstração financeira começa vazia e permanece exclusivamente local, separada do Firebase real.

### Interface e desempenho

- Tema global claro/escuro/sistema, botão de alternância e preferências persistidas por conta no Firestore. Aparência, formulários, painéis e módulos novos seguem o vocabulário visual existente.
- Navegação integrada com financeiro e preferências; formulários e cards adaptados ao celular, foco e modais nativos, erros e estados vazios orientativos.
- Escape de um modal respeita a decisão do componente durante gravações, evitando fechar visualmente um formulário ainda ocupado.
- Rotas públicas, autenticação, e-mail, portal, financeiro e preferências carregam sob demanda. O gráfico agrega os seis meses em uma passagem pelos registros, com memoização, em vez de repetir consultas locais por coluna.
- Coleções financeiras são lidas em lotes de 250 documentos, com recusa explícita acima de 10 mil por coleção. Esse limite evita saldo truncado; não substitui uma arquitetura de consolidação para grandes históricos.

## Verificação

| Verificação             | Resultado e cobertura                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`              | 24 testes: chat e parser CSV, identidades de importação, consultas incrementais e domínio anterior, rascunhos, CSV, validações financeiras, centavos, parcelas, transferências, calendários, recorrências e projeções                                                                                                                                                                                           |
| `npm run test:e2e`      | 17 jornadas: chat e importação, codificação inválida, prévia invalidada por outra edição, páginas e fluxos existentes, financeiro após recarga, transferências, recorrências, limites/metas, parcelamento, cancelar/restaurar, JSON, preferências e celular                                                                                                                                                     |
| `npm run test:rules`    | 4 suítes (incluindo chat e compatibilidade com produção) com múltiplas permissões permitidas/negadas: isolamento, privilégio, histórico industrial, livro imutável, versões, datas, recorrências e preferências                                                                                                                                                                                                                                |
| `npm run test:firebase` | 9 jornadas nos emuladores Authentication/Firestore: chat ao vivo, isolamento, repetição, mensagens/criação simultâneas, histórico anterior e reconexão; consultas incrementais, sincronização entre abas, lote de 100 registros, bloqueio offline, conflitos sem gravação parcial; conta/e-mail/orçamento/proposta/senha; gravações financeiras, segunda aba, conflitos, repetição e preferências; popup Google |
| `npm run build`         | Build de produção concluído                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm audit --omit=dev`  | Nenhuma vulnerabilidade reportada nas dependências de produção na execução desta sessão                                                                                                                                                                                                                                                                                                                         |
| Revisão visual          | Capturas em 1440 px e 390 px; chat cliente/admin e celular escuro, financeiro claro/escuro, prévia CSV, formulário móvel, painel e login escuros; sem rolagem horizontal nos cenários testados                                                                                                                                                                                                                  |

O teste Firebase financeiro também força renovação real do token durante o preenchimento do formulário, repete a criação do mesmo pedido e verifica recusa de uma revisão administrativa desatualizada. Os testes de integração usam SDKs reais contra emuladores locais, sem dados de clientes ou serviços pagos. A aprovação no emulador não certifica configuração, domínios, índices, entrega de e-mails ou disponibilidade em produção.

As imagens locais ficam em `artifacts/`, ignoradas pelo Git, e podem ser reproduzidas com o Vite na porta 5173 e `node scripts/capture-finance.mjs`. Os valores das imagens foram inseridos somente pela interface de demonstração.

## Medição de build

Antes desta evolução, o pacote principal tinha **366,53 kB**, ou **112,23 kB gzip**. Após separar as rotas, ficou em aproximadamente **320,6 kB**, ou **100,9 kB gzip**: redução aproximada de **12,5% / 10,1%** no arquivo principal. Após acrescentar importação e sincronização incremental, o principal fica em aproximadamente 321 kB (101 kB gzip), e o módulo financeiro cresce cerca de 12 kB (4 kB gzip). O chat acrescenta um módulo sob demanda de aproximadamente 540 kB (145 kB gzip), incluindo o SDK completo; o build avisa sobre seu tamanho. Esse custo de transferência ocorre ao abrir o chat, com o principal em aproximadamente 321,3 kB. Os novos módulos possuem seus próprios arquivos sob demanda; essa comparação não representa redução do tamanho total de todas as rotas combinadas nem uma medição de tempo em dispositivos reais.

Não se atribui ganho de latência aos tempos de build desta máquina, pois cache e aquecimento variam. A medição de consultas usa 600 lançamentos sintéticos somente no emulador. Não certifica capacidade ou faturamento em larga escala.

## Dependências externas e pendências

1. **Configuração e implantação:** a aplicação e as regras foram publicadas no Firebase existente `srservice-2-0`, em https://srservice-2-0.web.app. A configuração Web fica em `.env.production.local`, ignorado pelo Git. E-mail/senha e Google já estavam habilitados, com o domínio autorizado. O índice de pedidos foi acrescentado sem apagar índices existentes. Ainda é necessário indicar a conta responsável para habilitar o acesso administrativo e validar entrega de e-mails e login Google interativo no domínio real.
2. **Backup e recuperação:** JSON manual é exportação complementar, sem importador. Backup integral, restauração ensaiada, retenção/PITR e eventual bucket precisam de configuração administrativa e avaliação de custos. Procedimento inicial no README; nenhum serviço pago ativado.
3. **Escala:** o primeiro carregamento, a reconciliação manual e novas montagens do financeiro ainda exigem o histórico completo; consultas seguintes usam alterações incrementais. Permanece o limite de 10 mil documentos por coleção. Pedidos industriais ainda usam leitura global autorizada e paginação no cliente. Próxima prioridade: consolidações auditáveis no servidor, paginação e exportação consistentes para históricos grandes, com métricas de custo/latência.
4. **Offline e sincronização contínua do financeiro:** Firestore Lite mantém gravações online confirmadas; não há fila offline, cache financeiro persistente, listener em tempo real ou resolução automática de conflitos. Conflitos pedem recarga; a sincronização entre acessos ocorre na consulta. Migração de dados antigos/locais exige inventário e ferramenta própria, sem sobrescrita automática.
5. **Recorrências:** projeções são calculadas, não geradas por agendador em nuvem. O horizonte principal cobre o mês atual até 30 dias à frente e pendências já persistidas; consultar meses anteriores permite visualizar suas previsões. Não há confirmação automática de vencimento/pagamento.
6. **Escopo funcional futuro:** subcategorias e categorias personalizadas, gestão dedicada de dívidas/patrimônio, fechamento de fatura, bancos, pesquisa global, filtros favoritos, notificações push e histórico detalhado de cada edição financeira ainda não foram implementados. Os recursos atuais não exibem botões que os anunciem como disponíveis.
7. **Validação ampliada:** medir carga e custos com volume representativo, executar testes em navegadores/dispositivos adicionais, fazer auditoria formal de acessibilidade e validar todos os temas no ambiente publicado.

## Próximas evoluções recomendadas

Priorizar implantação controlada e restauração validada; depois consolidar consultas e saldos para escala. Só então acrescentar automações de servidor e módulos financeiros adicionais, mantendo a separação entre previsão, obrigação e pagamento e a autorização privada por conta.

## Publicação verificada em 23/10/2026

A versão foi publicada em https://srservice-2-0.web.app, com regras compiladas e índice de pedidos READY. Foram preservados os documentos de `usuarios`, `documentos` e `orcamentos`; o histórico original possui tela própria e o perfil aproveita os campos anteriores sem alterar o cadastro de origem. O endereço público foi verificado com Chromium: build novo, login Firebase real com conta técnica temporária, persistência da sessão após recarga, leitura autorizada do chat e dos pedidos, isolamento do histórico e viewport de 390 px, sem erros JavaScript. A conta técnica e seu perfil foram removidos ao finalizar. Nenhuma mensagem foi enviada à equipe em produção. Envio/resposta/persistência do chat foram verificados nos emuladores com cliente e administrador separados. O acesso administrativo real depende da identificação explícita da conta responsável; nenhum cliente foi promovido automaticamente. Entrega de e-mails, popup Google real e operações financeiras de produção continuam sujeitos a validação externa.
