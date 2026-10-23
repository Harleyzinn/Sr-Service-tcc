# SR Service · Cranes & Components

Site institucional, portal de atendimento e financeiro privado em React, Vite, **Firebase Authentication e Cloud Firestore**. Interface responsiva em português para clientes e equipe administrativa, com temas claro, escuro e automático.

Aplicação publicada no Firebase Hosting: **https://srservice-2-0.web.app**. O projeto de produção está identificado em `.firebaserc`. A configuração Web usada no build fica em `.env.production.local`, ignorado pelo Git; novos ambientes precisam preencher os quatro identificadores públicos de `.env.example`.

## Executar localmente

Requer Node.js 22.12+ (validado com Node 24) e npm.

```sh
npm ci
npm run dev
```

Em `/login`, **Sou cliente** e **Visão da equipe** abrem uma demonstração com registros fictícios. As alterações ficam no localStorage deste navegador; a sessão demo fica no sessionStorage. Nenhum pedido da demonstração é enviado ao Firebase. Evite dados pessoais reais nesse modo.

Para reiniciar os registros fictícios, remova a chave `sr-service-demo-v2` do localStorage pelas ferramentas do navegador.

## Páginas

| Rota                                   | Conteúdo                                                   |
| -------------------------------------- | ---------------------------------------------------------- |
| `/`                                    | Apresentação, especialidades e processo de atendimento     |
| `/sobre`, `/servicos`, `/contato`      | Empresa, seis especialidades, busca e contato              |
| `/login`, `/cadastro`                  | Acesso e criação de conta com confirmação de e-mail        |
| `/recuperar-senha`, `/redefinir-senha` | Solicitação de recuperação e nova senha                    |
| `/acao-email`                          | Confirmação de e-mail e recuperação por código do Firebase |
| `/privacidade`                         | Informações sobre tratamento de dados                      |
| `/app`                                 | Indicadores e solicitações recentes                        |
| `/app/orcamentos`                      | Busca, filtros e paginação                                 |
| `/app/novo-orcamento`                  | Solicitação em três etapas, revisão e envio                |
| `/app/orcamentos/:id`                  | Detalhes, proposta, histórico e impressão/PDF              |
| `/app/perfil`, `/app/ajuda`            | Perfil, alteração de senha e perguntas frequentes          |
| `/app/clientes`                        | Clientes com pedidos recebidos; exclusivo da equipe        |
| `/app/financeiro`                      | Caixa privado, agenda, contas, recorrências e planejamento |
| `/app/configuracoes`                   | Tema e widgets financeiros persistentes                    |
| `/app/chat`                            | Conversa cliente/equipe e caixa de atendimentos do admin   |
| `/app/historico`                       | Orçamentos originais da versão anterior, com status editável pela equipe |

URLs `.html` antigas redirecionam para as equivalentes. O diretório `legacy/` preserva o original para referência e não faz parte do build.

## Chat com os administradores

O botão flutuante **Chat com a equipe** no site público leva ao login e depois à conversa. No portal, o cliente acessa **Chat com a equipe** e os administradores acessam **Conversas**. O cliente inicia uma conversa única vinculada à conta; qualquer administrador com custom claim `admin: true` pode responder. As mensagens são textos de até 4.000 caracteres, com autor e data, atualizados em tempo real e preservados no Firestore após recarga e novo login. Ctrl/Cmd + Enter envia; Enter permite quebra de linha.

As regras isolam clientes e validam o papel do remetente. Mensagem e resumo do atendimento são gravados na mesma transação, com identificador estável para repetição segura e incremento atômico da contagem. Envios simultâneos preservam as mensagens; o aplicativo não permite editá-las ou apagá-las. A interface só incorpora mensagens confirmadas pelo servidor; sem conexão, novos envios ficam bloqueados. Texto digitado com erro de envio permanece no campo enquanto a tela estiver aberta, mas não é um rascunho persistente após recarregar.

O chat usa o SDK completo do Firestore apenas em seu módulo carregado sob demanda, com listeners e cache padrão somente em memória. O restante do sistema continua com Firestore Lite. A primeira janela consulta 50 mensagens e a caixa administrativa 25 conversas; **Carregar mensagens anteriores** / **Carregar mais conversas** ampliam as janelas. Isso não trunca o histórico armazenado. Ampliar a janela reconecta o listener e pode reler documentos já exibidos; alterações em tempo real e transações também consomem operações do Firestore. Os listeners são removidos ao sair da tela. Não há notificações push, indicador de leitura, anexos, resposta automática ou garantia de atendimento imediato.

Para funcionar em produção, preencha a configuração Firebase e publique as **novas regras** de `firestore.rules`, além do build. Não é necessário habilitar outro provedor ou criar índices compostos para o chat; as consultas usam índices de campo único padrão. Na demonstração, as conversas começam vazias, ficam em `sr-chat-demo-v1` no localStorage e nunca são enviadas ao servidor. Veja [CHAT.md](CHAT.md) para modelo e validações.

## Melhorias no atendimento

- O painel destaca pedidos por etapa e propostas disponíveis, com atalhos para os resultados correspondentes.
- Orçamentos aparecem em cards no celular, com equipamento, status, data e acesso aos detalhes sem rolagem horizontal.
- A lista combina busca, status e serviço, permite ordenar por data, atualização ou valor e exporta todos os resultados filtrados em CSV. A exportação preserva acentos e protege campos de texto contra interpretação como fórmulas de planilha.
- O formulário salva um rascunho no `sessionStorage`, separado por conta, projeto e ambiente de demonstração. O rascunho tem validade de 24 horas nesta aba e é removido ao enviar, descartar ou sair da conta. A recuperação retorna no máximo à segunda etapa: a revisão e o consentimento devem ser confirmados novamente.
- Os detalhes explicam o próximo passo e mostram a progressão do atendimento. A leitura no Firestore consulta diretamente o documento autorizado, sem carregar todos os pedidos.
- O menu móvel oferece fechamento por Escape e controle do foco. A troca de etapas direciona o foco para o título; campos de senha avisam quando Caps Lock está ativado. A busca de serviços aceita termos sem acentos.

O rascunho local não é um pedido enviado. Ele não é sincronizado entre dispositivos ou abas e pode ficar indisponível se o armazenamento do navegador estiver bloqueado.

O identificador da operação acompanha o rascunho: repetir o envio dos mesmos dados após uma resposta perdida recupera o pedido original. Atualizações administrativas verificam a revisão lida e recusam sobrescrever alterações feitas por outro acesso. Use **Recarregar dados** antes de reaplicar a mudança. A renovação do token da mesma conta preserva formulários abertos.

## Financeiro privado

- **Entrada / Gasto:** descrição, valor, data e conta. Categoria, situação e parcelamento ficam em opções expansíveis. Valores são armazenados em centavos inteiros; parcelamento de até 36 vezes distribui cada centavo e grava todas as parcelas atomicamente. Só a primeira pode começar realizada.
- **Contas e transferências:** conta corrente, dinheiro ou cartão com saldo manual. Saldos derivam do valor inicial e dos lançamentos realizados. Uma transferência é um único registro com origem e destino e não altera o consolidado. O saldo inicial e a identidade da conta permanecem imutáveis; correções financeiras usam lançamentos explícitos.
- **Livro e agenda:** busca, categoria, situação, seleção de mês, paginação de 20 itens e CSV filtrado. Datas futuras usam situação prevista. Cancelar preserva o registro e permite restaurá-lo como previsão; valores realizados não podem ser editados silenciosamente: cancele e registre a correção.
- **Recorrências:** entradas, salários, despesas fixas ou assinaturas com frequência semanal, mensal ou anual; editar, pausar, retomar e encerrar por data. O dia original é preservado ao atravessar meses curtos. Ocorrências futuras são projeções, não pagamentos automáticos. A confirmação grava o identificador determinístico `serie_data`, impedindo duplicação. Modificar uma série afeta suas projeções ainda não registradas; lançamentos persistidos permanecem intactos.
- **Painel:** saldo realizado, entradas e gastos mensais, comparação de despesas com o mês anterior, gráfico interativo de seis meses e projeção em 30 dias. A projeção inclui pendências registradas (inclusive atrasadas) e ocorrências virtuais do início do mês atual até o horizonte de 30 dias. Previsões de séries em meses anteriores podem ser consultadas pela seleção de mês; não são assumidas como pagamentos ou atrasos confirmados.
- **Planejamento:** limites por mês/categoria e metas com reserva informada manualmente. A reserva de uma meta não movimenta nem duplica o saldo das contas. Alertas apontam vencimentos, uso de 80% ou mais do limite e despesa superior ao dobro da mediana da categoria quando há pelo menos três registros históricos. Nenhuma análise é gerada por IA externa.
- **Preferências:** tema e seleção dos widgets de gráfico, alertas e metas. Contas reais persistem no Firestore; demonstração utiliza armazenamento local separado por conta.
- **Exportação:** JSON com os cinco conjuntos de registros persistidos, versão de esquema e data da exportação; CSV contém somente o mês e os filtros selecionados e identifica previsões virtuais. O JSON não inclui credenciais, perfis, pedidos ou preferências. Não há restaurador de backup JSON nesta versão.

### Importação de lançamentos em CSV

**Importar CSV** permite escolher uma conta e um arquivo UTF-8 de até 1 MB com no máximo 100 registros. A interface oferece um modelo para download e uma prévia completa antes da confirmação. O parser aceita ponto e vírgula ou vírgula como separador, campos entre aspas, aspas escapadas, quebra de linha em descrições e BOM.

Colunas obrigatórias: `Data`, `Descrição`, `Tipo` e `Valor (R$)`. O tipo é `Entrada` ou `Gasto`; datas aceitam `AAAA-MM-DD` e `DD/MM/AAAA`. Categoria é opcional (padrão `Outros`); situação é opcional (padrão `Previsto`) e aceita `Realizado`, `Previsto` ou `Cancelado`. Valores positivos usam até duas casas decimais; o formato brasileiro `1.234,56` também é aceito. Valores com sinal negativo ou separadores ambíguos são recusados.

Um erro em qualquer registro bloqueia o arquivo inteiro. Transferências e previsões virtuais de recorrências são recusadas: devem usar as funções que preservam origem/destino e identidade da série. A gravação válida ocorre em uma única transação. O importador não é um leitor universal de extratos bancários nem restaura backups JSON.

IDs determinísticos reconhecem a repetição do mesmo conteúdo, mesmo com reordenação de linhas, e não restauram um lançamento cancelado. Linhas idênticas dentro do arquivo mantêm identidades distintas; registros semelhantes aos cadastrados manualmente ficam excluídos por padrão, com inclusão explícita após conferência. Se o livro mudar durante a prévia, é necessário analisar novamente. A confirmação real fica bloqueada sem conexão. Nenhum registro existente é sobrescrito pela importação.

O financeiro começa vazio, inclusive na demonstração. **Uma proposta comercial não é um recebimento**: nenhum valor dos orçamentos é lançado automaticamente. As operações reais são confirmadas somente após resposta do Firestore. Em erro de leitura, o painel não apresenta totais parciais.

### Sincronização, custos e limites

Os dispositivos consultam o mesmo Firestore ao abrir/atualizar o módulo, após gravações e ao retornar à aba ou recuperar a conexão. Abas visíveis da mesma origem e conta notificam alterações por BroadcastChannel, com agrupamento de eventos; a mensagem contém somente um sinal de invalidação, sem registros financeiros. Sem suporte ao canal, permanece a atualização por foco/reconexão e, na demonstração, pelo evento de armazenamento. Não há listener contínuo no servidor, fila de escrita offline ou cache persistente do financeiro: o aviso de conexão informa essa limitação e os rascunhos de orçamento continuam locais. Não há importação automática dos dados da demonstração para uma conta real.

As coleções financeiras são consultadas em lotes de 250 documentos. A primeira consulta lê o histórico completo; as seguintes, na mesma montagem do módulo, mesclam somente documentos com `updated_at` a partir da última marca de cada coleção. As marcas preservam a precisão do Timestamp e a fronteira é inclusiva: registros com o mesmo timestamp podem ser relidos para evitar lacunas. Falhas não avançam as marcas nem substituem o conjunto por dados parciais; consultas simultâneas são serializadas. O cache fica apenas na memória da instância, sem compartilhamento entre contas, e o botão **Atualizar** faz uma reconciliação completa. Exclusões administrativas fora do aplicativo exigem essa atualização completa ou recarga da página; as regras Web impedem exclusões.

Em teste no emulador com 600 lançamentos e uma conta, a consulta inicial recebeu 601 documentos; outra sem mudanças recebeu 2; após alterar um lançamento antigo e criar outro, recebeu 4. São documentos retornados nas consultas, não medição de faturamento: consultas vazias têm cobrança mínima e validações/transações podem ler documentos adicionais. A primeira consulta e novas montagens ainda têm custo proporcional ao histórico.

Acima de 10 mil registros em uma coleção, o cálculo é interrompido com orientação, sem truncar saldos. Paginação que não termina por mudanças contínuas também é interrompida. A listagem industrial anterior ainda carrega todos os pedidos autorizados. Antes de escalar esses volumes, implemente consolidações transacionais no servidor e consultas paginadas adequadas aos relatórios; a paginação visual não reduz essas leituras.

Não há integração bancária, fechamento de fatura, processamento de pagamentos, notificações push ou agendador de cobranças. Cartões e metas são controles manuais identificados na interface.

## Configurar o Firebase real

Sem as variáveis, o acesso real mostra uma mensagem de configuração; a demonstração continua disponível. Nenhum projeto de produção foi provisionado ou alterado automaticamente.

1. No console Firebase, crie ou selecione um projeto e registre um **aplicativo Web**.
2. Copie `.env.example` para `.env` e preencha `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` com os valores da configuração Web. Esses identificadores são públicos. Nunca coloque chaves privadas ou credenciais de conta de serviço em variáveis `VITE_`.
3. Em Authentication, habilite **E-mail/senha** e **Google**, configure o e-mail de suporte do provedor Google, senha mínima de oito caracteres e autorize os domínios de desenvolvimento e produção usados pelo aplicativo. O Vite usa `127.0.0.1` por padrão. O login Google utiliza popup; valide-o no domínio publicado e nos navegadores de destino. Provedor desabilitado ou popup bloqueado são informados na interface.
4. Crie o **Cloud Firestore** no modo de produção. Publique as regras e o índice versionados, selecionando explicitamente seu projeto:

```sh
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project ID_DO_PROJETO
```

5. Aguarde o índice composto ficar pronto. A listagem do cliente usa `user_id` e `created_at`; o índice está em `firestore.indexes.json`.
6. Em Authentication → Templates, personalize as mensagens em português. Para usar as telas do aplicativo, configure a URL de ação dos modelos de confirmação e recuperação como `https://SEU_DOMINIO/acao-email`. O Firebase acrescenta `mode` e `oobCode` ao link. O handler padrão hospedado pelo Firebase também pode ser usado; nesse caso, a ação ocorre na página padrão e o usuário retorna ao login.
7. Reinicie o Vite ou gere um novo build após alterar as variáveis. Valide o recebimento e a entrega dos e-mails no projeto real.

O cadastro cria o usuário no Authentication e grava um perfil no Firestore. A conta só acessa orçamentos depois da confirmação do e-mail. Caso o envio da confirmação ou a gravação do perfil falhe após criar a conta, a interface informa o ocorrido; o usuário pode tentar entrar para reenviar a confirmação e completar o perfil. O perfil ausente é criado de forma transacional no próximo acesso confirmado.

### Administradores

A permissão vem da **custom claim `admin: true`** do Firebase Authentication. Um campo no perfil não concede acesso à equipe. Use o Admin SDK em um ambiente confiável, com credenciais administrativas pelo mecanismo Application Default Credentials:

```sh
node scripts/set-admin.mjs ID_DO_PROJETO email-da-equipe@empresa.com.br
```

O script preserva outras claims e exige uma conta já cadastrada. Configure as credenciais administrativas no ambiente local ou servidor; nunca envie a chave ao navegador ou ao Git. Depois da promoção, saia e entre novamente para renovar o token.

### Dados e permissões

- `profiles/{uid}`: dados de contato. O cliente lê e edita apenas seu perfil; não pode incluir privilégios ou alterar identidade/e-mail por esse documento.
- `quotes/{id}`: solicitação, proposta e histórico. O identificador único do documento também compõe a referência `SR-...`, sem contador global editável. Os números sequenciais vistos na demonstração são fictícios.
- Clientes com e-mail confirmado consultam somente seus pedidos e criam solicitações com status inicial `Recebido`, sem valor ou proposta pré-definidos.
- Apenas administradores podem atualizar status, valor e observações. Proprietário, referência, descrição e datas originais são imutáveis pela aplicação.
- O histórico é um mapa de eventos dentro do pedido. Toda mudança de status exige, pelas regras, exatamente um novo evento com o mesmo status e timestamp do servidor, na mesma gravação. Eventos anteriores não podem ser alterados ou removidos. Atualizações sem mudança de status preservam o histórico.
- Clientes e administradores não excluem pedidos pela API Web.
- Senhas ficam exclusivamente no Firebase Authentication. A troca de senha pode exigir login recente; a interface orienta a entrar novamente.
- `users/{uid}/accounts`, `entries`, `series`, `budgets` e `goals`: financeiro exclusivo do UID com e-mail confirmado. A claim de administrador do atendimento **não concede acesso ao financeiro alheio**. Regras validam campos, tipos, datas reais, centavos, contas de origem/destino, identidade das recorrências e versões; impedem exclusão e edição dos valores de lançamentos existentes. Pagamentos futuros são recusados também pelas regras (dia em UTC−03).
- `users/{uid}/preferences/interface`: somente tema e widgets permitidos, restritos ao proprietário. Não há credencial administrativa no navegador.

Documentação: [autenticação Web](https://firebase.google.com/docs/auth/web/manage-users), [ações de e-mail](https://firebase.google.com/docs/auth/custom-email-handler), [custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [regras do Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Testes

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run test:rules
npm run test:firebase
npm run build
```

`npm test` verifica documentos, validação, busca, exportação segura, centavos, parcelas, transferências, recorrências, calendários, projeções, limites, parser CSV, identidades de importação e consultas incrementais. `test:e2e` percorre as páginas e as demonstrações sem configuração real, incluindo financeiro, recarga, cancelamento/restauração, exportação JSON, importação validada, prévia invalidada por outra edição, temas e celular. Execute essa suíte sem um `.env` preenchido, pois ela também verifica mensagens de configuração ausente.

`test:rules` inicia o emulador Firestore com o projeto fictício `demo-sr-service`, publica as regras localmente e testa acessos permitidos e bloqueados, isolamento entre clientes, papéis, imutabilidade e histórico obrigatório. Requer Java 21+.

`test:firebase` inicia os emuladores Authentication e Firestore e executa jornadas no navegador: cadastro, confirmação de e-mail, login, gravação de orçamento, atualização de proposta por administrador, recuperação e acesso com a nova senha; fluxo de popup Google no emulador; financeiro persistido, repetição idempotente, conflito de versões, consulta em segunda aba, preferências e renovação de token sem perder formulário; medição de consultas incrementais com 600 lançamentos, atualização entre abas e importação atômica de 100 registros, incluindo reimportação e bloqueio offline. Os códigos de e-mail são obtidos do emulador; nenhum e-mail é enviado. A suíte usa a porta 5174 e configuração de emuladores apenas no processo de testes.

Para desenvolvimento manual com emuladores, use um projeto fictício `demo-sr-service`, preencha as variáveis Web de teste e defina `VITE_FIREBASE_USE_EMULATORS=true`. Inicie:

```sh
npx firebase emulators:start --only auth,firestore --project demo-sr-service
```

Depois execute o Vite. As conexões aos emuladores são restritas a builds de desenvolvimento. Não use credenciais de produção nesse modo. Os testes não substituem a validação de domínios autorizados, criação do índice e entrega de e-mails em produção.

## Build e publicação

```sh
npm run build
npm run preview
```

Publique `dist/` com fallback das rotas para `index.html`. O projeto inclui configuração para Firebase Hosting, Vercel e Netlify. Para publicar pelo Firebase após configurar o projeto:

```sh
npx firebase deploy --only hosting --project ID_DO_PROJETO
```

O build contém apenas a aplicação nova, imagens e fontes locais. O envio de orçamento grava no Firestore; não inclui notificações automáticas por e-mail ou WhatsApp. Revise os contatos comerciais antes de publicar; o e-mail foi preservado do original e sua disponibilidade não foi confirmada.

O projeto Firebase existente contém `usuarios`, `documentos` e `orcamentos`. As regras dessas coleções foram preservadas com funções prefixadas e permitem também administradores verificados com custom claim. Os pedidos originais podem ser consultados em **Histórico anterior**, com atualização de status pela equipe e bloqueio de alteração dos demais campos. No primeiro acesso, um perfil novo pode aproveitar os campos do cadastro original, sem alterar `usuarios`. As contas do Firebase Authentication continuam sendo as mesmas; e-mails ainda não verificados precisam da confirmação antes de acessar o portal. Não há conversão destrutiva nem importação automática de SQL ou de bancos externos.

Para atualizar esta instalação, configure `.env.production.local`, execute os testes e o build e use `npx firebase deploy --only hosting,firestore:rules --project srservice-2-0`. O índice composto de `quotes` deve estar em estado **READY** antes de liberar os pedidos aos clientes. Em projetos existentes, inventarie os índices e acrescente os necessários sem remover índices de outras aplicações; não publique um catálogo reduzido de índices indiscriminadamente. Os novos arquivos de assets têm cache imutável, e o documento da aplicação exige revalidação.

### Backup e recuperação operacional

Antes de publicar regras em um projeto com dados existentes, inventarie os documentos, produza uma exportação administrativa do Firestore em ambiente confiável e valide sua restauração em um projeto separado. A ativação de backup gerenciado, PITR, armazenamento em bucket ou tarefas agendadas depende do plano, região, permissões e custos do projeto; nada disso foi habilitado automaticamente. Mantenha exports em armazenamento privado com acesso restrito e política de retenção. O JSON do financeiro é um complemento manual; não substitui backup integral nem restauração validada. Não importe a demonstração nem sobrescreva documentos de produção para validar o sistema.

Consulte [AUDIT.md](AUDIT.md) para o diagnóstico inicial e [EVOLUTION_REPORT.md](EVOLUTION_REPORT.md) para escopo, resultados e pendências da evolução.

## Estrutura

```text
src/
  firebase.js          Configuração Web e emuladores em desenvolvimento
  firebase-auth.js     Login, cadastro e ações de senha/e-mail
  firebase-data.js     Perfis, transações e acesso ao Firestore
  api.js               Repositório real e demonstração isolada
  auth.jsx             Sessão e custom claims
  auth-pages.jsx       Formulários de autenticação
  email-action.jsx     Handler dos links de confirmação e recuperação
  domain.js            Validações e busca
  main.jsx             Rotas
  portal.jsx           Páginas do cliente e da equipe
  public.jsx           Site institucional
  ui.jsx               Componentes e layouts
  finance/domain.js    Regras de caixa, calendário e recorrências
  finance/repository.js Persistência transacional real e demo isolada
  finance/incremental-loader.js Cache de consulta versionado e cursores
  finance/csv-import.js Parser, validação e identidades de importação
  finance/import-dialog.jsx Prévia e confirmação de importação
  finance/use-finance.jsx Estado, consulta e confirmação de gravações
  finance/page.jsx     Painel e fluxos financeiros
  theme.jsx            Preferências locais/Firebase e tema
  preferences.jsx      Configurações de aparência e widgets
  network.jsx          Estado de conexão e orientação offline
  chat/firebase.js     SDK Firestore completo, restrito ao módulo de chat
  chat/repository.js   Conversas, listeners e envios transacionais
  chat/page.jsx        Caixa administrativa e conversa do cliente
firestore.rules        Regras de acesso e integridade
firestore.indexes.json Índice de pedidos e exclusão do histórico da indexação
firebase.json          Emuladores, Firestore e Hosting
scripts/set-admin.mjs  Administração via credenciais de servidor
```
