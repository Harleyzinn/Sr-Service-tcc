# SR Service · Cranes & Components

Site institucional e portal de atendimento em React, Vite, **Firebase Authentication e Cloud Firestore**. Interface responsiva em português para clientes e equipe administrativa.

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

URLs `.html` antigas redirecionam para as equivalentes. O diretório `legacy/` preserva o original para referência e não faz parte do build.

## Configurar o Firebase real

Sem as variáveis, o acesso real mostra uma mensagem de configuração; a demonstração continua disponível. Nenhum projeto de produção foi provisionado ou alterado automaticamente.

1. No console Firebase, crie ou selecione um projeto e registre um **aplicativo Web**.
2. Copie `.env.example` para `.env` e preencha `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` com os valores da configuração Web. Esses identificadores são públicos. Nunca coloque chaves privadas ou credenciais de conta de serviço em variáveis `VITE_`.
3. Em Authentication, habilite **E-mail/senha**, configure senha mínima de oito caracteres e autorize os domínios de desenvolvimento e produção usados pelo aplicativo. O Vite usa `127.0.0.1` por padrão.
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

`npm test` verifica documentos, validação e busca. `test:e2e` percorre as páginas e as demonstrações sem configuração real. Execute essa suíte sem um `.env` preenchido, pois ela também verifica mensagens de configuração ausente.

`test:rules` inicia o emulador Firestore com o projeto fictício `demo-sr-service`, publica as regras localmente e testa acessos permitidos e bloqueados, isolamento entre clientes, papéis, imutabilidade e histórico obrigatório. Requer Java 21+.

`test:firebase` inicia os emuladores Authentication e Firestore e executa uma jornada completa no navegador: cadastro, confirmação de e-mail, login, gravação de orçamento, atualização de proposta por administrador, recuperação e acesso com a nova senha. Os códigos de e-mail são obtidos do emulador; nenhum e-mail é enviado. A suíte usa a porta 5174 e configuração de emuladores apenas no processo de testes.

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

Contas e pedidos do sistema anterior não são importados automaticamente. O novo aplicativo não usa o cliente, as variáveis, a migração SQL ou as dependências do banco anterior. O material original permanece apenas em `legacy/`.

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
firestore.rules        Regras de acesso e integridade
firestore.indexes.json Índice de pedidos e exclusão do histórico da indexação
firebase.json          Emuladores, Firestore e Hosting
scripts/set-admin.mjs  Administração via credenciais de servidor
```
