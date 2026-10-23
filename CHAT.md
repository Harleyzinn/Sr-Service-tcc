# Chat persistente cliente ↔ administrador

## Entrega

Rota protegida `/app/chat`, atalho no menu e botão de entrada no site público. A autenticação existente é obrigatória; contas precisam de e-mail confirmado. Cada cliente inicia seu próprio atendimento. Administradores usam a custom claim existente `admin: true`, veem a caixa de conversas por atualização recente e respondem no mesmo histórico. Seleção administrativa fica em `?conversa=UID`; o cliente sempre recebe seu próprio UID, independentemente desse parâmetro.

Mensagens textuais, autor cliente/equipe, data e hora, atualizações em tempo real, histórico anterior carregável, validação de texto vazio/4.000 caracteres, envio por botão ou Ctrl/Cmd + Enter, erros compreensíveis e retorno de conexão. Temas e celular seguem o portal. Texto é renderizado pelo React como texto, sem interpretar HTML. Não há mensagens pré-fabricadas ou robô respondendo como administrador.

## Persistência e autorização

- `conversations/{customerUid}`: `customer_id`, `customer_name`, `customer_company`, `created_at`, `updated_at`, `last_message_id`, `last_text`, `last_sender_id`, `last_sender_role`, `message_count`.
- `conversations/{customerUid}/messages/{operationId}`: `sender_id`, `sender_role` (`customer`/`admin`), `text`, `created_at`.
- Remetente vem da sessão; regras exigem o UID autenticado e validam o papel pela claim. Cliente não lista a caixa geral nem acessa outra conversa, mesmo alterando a URL ou forjando uma flag de admin no JavaScript.
- O primeiro envio cria conversa e mensagem atomicamente. Respostas gravam a mensagem e atualizam resumo/contagem na mesma transação. Contagem usa incremento do servidor, evitando perda com envios simultâneos. Regras exigem mensagem nova vinculada ao resumo atualizado e timestamps do servidor; escrita incompleta é rejeitada.
- Repetir um identificador com o mesmo remetente, papel e texto reconhece o envio existente. Conteúdo divergente é recusado. Disputa na primeira criação pode ser tentada novamente de forma limitada somente depois de uma leitura autorizada no servidor comprovar que a conversa avançou.
- Mensagens e conversas não podem ser excluídas pelo cliente Web; mensagens não podem ser editadas, nem pelo administrador. Nome/empresa iniciais do atendimento permanecem no resumo. Retenção, exportação integral e exclusão administrativa são operações externas, ainda sem interface própria.

## Conexão e custo

Listeners reais do SDK `firebase/firestore`, carregado somente ao abrir o chat. Firestore Lite continua nos módulos anteriores. O SDK completo adiciona aproximadamente 540 kB minificados (145 kB gzip) ao módulo sob demanda e gera aviso de chunk grande no build; essa transferência não integra a entrada inicial das outras páginas. Cache de mensagens somente em memória, sem IndexedDB persistente configurado para o chat.

Os listeners ignoram escritas pendentes e só exibem a janela recebida do servidor. Em perda de conexão, mensagens já exibidas podem permanecer visíveis, com estado de reconexão; envios novos são pausados. Não há fila offline. Texto não enviado permanece apenas no estado da tela; depois de recarregar, o histórico confirmado volta do Firestore ao conectar. O chat não anuncia disponibilidade de um administrador nem garante resposta imediata.

Janela inicial de 50 mensagens e 25 conversas administrativas. Ampliar reconecta e relê uma janela maior, com custo proporcional. O histórico armazenado permanece completo; não há limite artificial de mensagens salvas. Cada envio grava mensagem e resumo e realiza leituras transacionais/regras; existem custos de listeners/reconexão conforme o plano. Nenhum projeto pago ou agendador foi ativado nesta sessão.

## Verificação

- Domínio: texto vazio, tamanho, quebra de linha/HTML literal e comparação segura de repetição.
- Regras em emulador: cliente/equipe autorizados, estranho/conta não confirmada/anônimo bloqueados; papel falso, metadados sem mensagem, mensagem sem resumo, contagem incorreta e edição/exclusão recusados.
- Navegador/demo: entrada pública → login → conversa, envio, recarga, troca cliente/admin, resposta, histórico preservado e uso em celular sem executar HTML inserido na mensagem.
- Firebase Authentication + Firestore emulados: sessões de cliente/admin distintas, recebimento ao vivo nos dois lados, intruso com flag administrativa falsa bloqueado no servidor, repetição idempotente, envios simultâneos, histórico após recarga, queda/retomada de conexão, carregamento de 61 mensagens e criação inicial simultânea.
- Capturas reproduzíveis por `node scripts/capture-chat.mjs` com o Vite na porta 5173; saída em `artifacts/`, ignorada pelo Git. Dados das capturas são enviados exclusivamente pela interface de demonstração.

## Implantação pendente

Esta cópia não possui configuração real preenchida. Publicar o build e as regras novas no projeto Firebase escolhido, usando os comandos do README, e validar com cliente e administrador de teste. A custom claim de equipe continua sendo atribuída em ambiente confiável por `scripts/set-admin.mjs`. Não foram enviados recados a administradores reais, criadas credenciais ou modificados dados de produção.
