# SR Service · Cranes & Components

Reconstrução do TCC em React, Vite e Supabase. Site institucional responsivo e portal com áreas de cliente e equipe. Interface em português, identidade visual azul-marinho e laranja e imagens preservadas do projeto original.

## Executar

Requer Node.js 22.12+ (validado com Node 24) e npm.

```sh
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. Em `/login`, **Sou cliente** e **Visão da equipe** abrem a demonstração. Os dados são fictícios, isolados do Supabase e persistidos no localStorage deste navegador. A sessão de demonstração fica no sessionStorage. Nenhuma senha de demonstração é criada. Evite dados pessoais reais nesse modo.

Para reiniciar os registros fictícios, remova a chave `sr-service-demo-v2` do localStorage pelas ferramentas do navegador. Para sair, use o botão da conta ou a faixa de demonstração.

## Páginas e fluxos

| Rota                                   | Conteúdo                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `/`                                    | Apresentação, especialidades, empresa e processo de atendimento            |
| `/sobre`                               | Empresa e princípios de atuação                                            |
| `/servicos`                            | Seis especialidades, busca e acesso ao orçamento com serviço selecionado   |
| `/contato`                             | Canais de contato e acesso ao atendimento                                  |
| `/login`, `/cadastro`                  | Autenticação e cadastro                                                    |
| `/recuperar-senha`, `/redefinir-senha` | Recuperação e definição de nova senha por e-mail                           |
| `/privacidade`                         | Informações de tratamento de dados                                         |
| `/app`                                 | Indicadores e solicitações recentes                                        |
| `/app/orcamentos`                      | Busca por referência, equipamento, contato ou empresa; filtros e paginação |
| `/app/novo-orcamento`                  | Formulário em três etapas, revisão e envio                                 |
| `/app/orcamentos/:id`                  | Detalhes, proposta, histórico e impressão/PDF pelo navegador               |
| `/app/perfil`                          | Dados da conta e alteração de senha                                        |
| `/app/clientes`                        | Clientes derivados dos pedidos recebidos; exclusivo para administradores   |
| `/app/ajuda`                           | Perguntas frequentes e contato                                             |

As URLs `.html` do site anterior redirecionam para suas equivalentes. Rotas desconhecidas mostram uma página 404. O diretório `legacy/` preserva o projeto antigo para referência; ele **não** é copiado para `dist/` nem utilizado pela aplicação.

## Ativar contas e dados reais

A configuração do ambiente e a aplicação da migração são necessárias para o uso real. Sem elas, o aplicativo não simula sucesso de login, cadastro ou recuperação de senha. A demonstração permanece disponível de forma explícita.

1. Crie ou selecione um projeto Supabase.
2. Aplique **uma vez**, pelo SQL Editor, `supabase/migrations/001_initial.sql`. A migração cria `sr_profiles`, `sr_quotes` e `sr_quote_events`, com permissões e RLS. Não altera nem importa as tabelas antigas `usu_cadastro` e `tb_orcamento`. Para novas contas, o perfil é criado por um trigger transacional. Contas já existentes em Auth recebem um perfil básico; dados adicionais podem ser preenchidos em Meu perfil.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e a chave **publicável/anon** do projeto. Nunca coloque `service_role` ou uma chave secreta no frontend.
4. Em Authentication → URL Configuration, configure a Site URL de produção e adicione às Redirect URLs os endereços completos de `/app` e `/redefinir-senha`, em desenvolvimento e produção. Exemplo local: `http://127.0.0.1:5173/app` e `http://127.0.0.1:5173/redefinir-senha`.
5. Habilite o provedor de e-mail, confirmação de cadastro e configure SMTP para envio real. Ajuste a política de senha para pelo menos oito caracteres.
6. Reinicie o Vite ou gere um novo build após alterar as variáveis. Variáveis `VITE_` são incorporadas ao build.

Para promover uma conta à equipe, um administrador do projeto deve atualizar **app_metadata** pelo servidor ou SQL Editor. A permissão não depende de dados de perfil ou `user_metadata`, que o usuário pode editar. Exemplo, substituindo o e-mail:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'email-da-equipe@empresa.com.br';
```

Saia e entre novamente para renovar o token após uma alteração de papel. Não existe opção de autopromoção no cadastro ou no perfil.

### Regras do banco

- Clientes consultam apenas seus perfis, pedidos e históricos e podem enviar novas solicitações em seu próprio nome.
- Atualização de status, valor e observações é exclusiva de administradores. Identidade, proprietário e datas não podem ser reescritos pelo frontend.
- O histórico é registrado automaticamente no banco quando o status muda. Clientes e administradores não podem criar eventos diretamente pela API pública.
- Senhas são gerenciadas exclusivamente pelo Supabase Auth. Não são salvas em tabelas de perfil.
- Não há exclusão de pedidos na interface, preservando a rastreabilidade do atendimento.

Documentação usada: [gerenciamento de usuários](https://supabase.com/docs/guides/auth/managing-user-data), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Verificação

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm test` verifica regras de documentos, dados de formulário e busca, e executa a migração em PostgreSQL via PGlite. O teste de banco usa papéis `anon` e `authenticated` e um contrato local das funções `auth.uid()` e `auth.jwt()` para comprovar isolamento entre clientes, bloqueio de alterações indevidas e registro de histórico. Não acessa o banco de produção.

Os testes Playwright percorrem páginas públicas, rotas protegidas, demonstrações de cliente e equipe, solicitação e busca de orçamento, edição de perfil, atualização de proposta, filtros e navegação mobile. Os testes de autenticação sem configuração conferem mensagens e navegação; **não substituem** uma validação integrada de e-mails e sessões no Supabase real. Execute a suíte sem `.env` de produção.

Para capturas locais de referência com o servidor ativo: `node scripts/capture.mjs`. As imagens são salvas em `artifacts/`, que não é versionado.

## Publicação

```sh
npm run build
npm run preview
```

Publique `dist/` em hospedagem estática com fallback de rotas para `index.html`. Há configurações para Vercel (`vercel.json`) e Netlify (`netlify.toml` e `public/_redirects`). Para subdiretórios ou GitHub Pages, configure `base` e roteamento apropriados antes de publicar; a configuração padrão pressupõe domínio na raiz.

O build publica apenas o aplicativo novo e as imagens de `public/`. Revise os dados comerciais e de contato e as informações de privacidade com o responsável pela empresa antes da publicação. O e-mail de contato foi preservado do projeto original; sua disponibilidade não foi confirmada. O envio de orçamento grava no portal; não inclui disparos automáticos de e-mail ou WhatsApp.

## Estrutura

```text
src/
  api.js              Supabase e repositório separado de demonstração
  auth.jsx            Sessão, perfil e papel da equipe
  auth-pages.jsx      Login, cadastro e recuperação
  domain.js           Validação e regras compartilhadas
  main.jsx            Rotas e tratamento de falhas
  portal.jsx          Páginas do cliente e da administração
  public.jsx          Site institucional
  ui.jsx              Layouts e componentes compartilhados
  styles.css          Identidade visual, responsividade e impressão
supabase/migrations/  Estrutura, políticas e triggers
tests/                Domínio, banco e jornadas em navegador
legacy/               Original preservado, fora do build
```
