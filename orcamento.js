document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o Supabase carregou
    if (typeof supabase === 'undefined') {
        console.error('Erro: Supabase client não encontrado.');
        return;
    }

    const formOrcamento = document.getElementById('form-orcamento');
    if (!formOrcamento) return;

    formOrcamento.addEventListener('submit', async(event) => {
        event.preventDefault();

        // Feedback visual de carregamento no botão
        const btnSubmit = formOrcamento.querySelector('button[type="submit"]');
        const btnOriginalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Usa a nova função de modal se disponível, senão alert
                if (typeof showCustomModal === 'function') {
                    await showCustomModal('Você precisa estar logado para solicitar um orçamento.', 'Login Necessário');
                } else {
                    alert('Você precisa estar logado para solicitar um orçamento.');
                }

                // Abre o popup de login se possível
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.click();

                throw new Error('Usuário não logado');
            }

            // Busca o ID do usuário e status de admin
            const { data: perfil, error: perfilError } = await supabase
                .from('usu_cadastro')
                .select('COD_USUARIO, admin')
                .eq('EMAIL_USU', user.email)
                .single();

            if (perfilError || !perfil) {
                throw new Error('Perfil de usuário não encontrado. Complete seu cadastro em "Meu Perfil".');
            }

            // Bloqueio de Admin
            if (perfil.admin === 1) {
                if (typeof showCustomModal === 'function') {
                    await showCustomModal('Administradores não podem solicitar orçamentos.', 'Ação Negada');
                } else {
                    alert('Administradores não podem solicitar orçamentos.');
                }
                throw new Error('Admin blocked');
            }

            // Coleta dados do form
            const form = event.target;
            const orcamentoData = {
                NOME_EMPRESA: form.nome_empresa.value,
                NOME_CONTATO: form.nome_contato.value,
                EMAIL_CONTATO: form.email_orc.value,
                TELEFONE_CONTATO: form.telefone.value,
                TIPO_SERVICO: form.tipo_servico.value,
                DESCRICAO: form.descricao.value,
                // --- MUDANÇA AQUI ---
                STATUS_ORCAMENTO: 'Não Visualizado', // Status inicial para novos pedidos
                // --------------------
                fk_cod_usuario: perfil.COD_USUARIO
            };

            // Envia para o Supabase
            const { error } = await supabase.from('tb_orcamento').insert(orcamentoData);

            if (error) throw error;

            // Sucesso
            if (typeof showCustomModal === 'function') {
                await showCustomModal('Seu pedido de orçamento foi enviado com sucesso! Acompanhe o status em "Meus Orçamentos".', 'Sucesso');
            } else {
                alert('Pedido de orçamento enviado com sucesso!');
            }

            form.reset();

        } catch (error) {
            // Ignora erros controlados
            if (error.message === 'Usuário não logado' || error.message === 'Admin blocked') return;

            console.error(error);
            if (typeof showCustomModal === 'function') {
                showCustomModal('Ocorreu um erro ao enviar: ' + error.message, 'Erro');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            // Restaura botão
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = btnOriginalText;
        }
    });
});