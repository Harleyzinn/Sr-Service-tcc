document.addEventListener('DOMContentLoaded', async() => {
    // VERIFICAÇÃO DE LOGIN AO ENTRAR NA PÁGINA
    if (typeof supabase === 'undefined') {
        console.error('Erro: Supabase client não encontrado.');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Se não estiver logado, avisa e redireciona
    if (!user) {
        setTimeout(async() => {
            if (typeof showCustomModal === 'function') {
                await showCustomModal('Você precisa estar logado para solicitar orçamentos. Clique em OK para ir à página de login.', 'Acesso Restrito');
            } else {
                alert('Acesso Restrito. Faça login.');
            }
            window.location.href = 'index.html';
        }, 500);
        return;
    }

    // --- BLOQUEIO DE ADMIN ---
    const { data: perfil, error: perfilError } = await supabase
        .from('usu_cadastro')
        .select('COD_USUARIO, admin')
        .eq('EMAIL_USU', user.email)
        .single();

    if (perfil && perfil.admin === 1) {
        if (typeof showCustomModal === 'function') {
            await showCustomModal('Administradores não podem enviar orçamentos. Clique em OK para acessar o Painel Administrativo.', 'Acesso de Admin');
        } else {
            alert('Administradores não podem enviar orçamentos.');
        }
        window.location.href = 'admin.html';
        return;
    }

    const formOrcamento = document.getElementById('form-orcamento');
    if (!formOrcamento) return;

    // --- MÁSCARA DE TELEFONE (Visual) ---
    const telInput = document.getElementById('telefone');
    if (telInput) {
        telInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            // Limita a 11 dígitos (DDD + 9 dígitos)
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 10) {
                // (XX) 9XXXX-XXXX
                value = value.replace(/^(\d{2})(\d)/, "($1) $2");
                value = value.replace(/(\d{5})(\d)/, "$1-$2");
            } else {
                // (XX) XXXX-XXXX
                value = value.replace(/^(\d{2})(\d)/, "($1) $2");
                value = value.replace(/(\d{4})(\d)/, "$1-$2");
            }
            e.target.value = value;
        });
    }

    // --- ENVIO DO FORMULÁRIO ---
    formOrcamento.addEventListener('submit', async(event) => {
        event.preventDefault();

        const btnSubmit = formOrcamento.querySelector('button[type="submit"]');
        const btnOriginalText = btnSubmit.innerHTML;

        try {
            const form = event.target;
            const email = form.email_orc.value.trim();
            const telefoneRaw = form.telefone.value;
            const telefoneLimpo = telefoneRaw.replace(/\D/g, '');

            // --- VALIDAÇÕES PRÉ-ENVIO ---

            // 1. Validação de E-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Por favor, insira um endereço de e-mail válido.');
            }

            // 2. Validação de Telefone (Tamanho)
            if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
                throw new Error('O telefone deve ter 10 ou 11 dígitos (DDD + Número).');
            }

            // Se passou nas validações, bloqueia o botão
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            // Re-valida sessão antes de enviar (segurança)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error('Sessão expirou.');

            const orcamentoData = {
                NOME_EMPRESA: form.nome_empresa.value,
                NOME_CONTATO: form.nome_contato.value,
                EMAIL_CONTATO: email,
                TELEFONE_CONTATO: telefoneRaw, // Envia formatado para facilitar leitura no admin
                TIPO_SERVICO: form.tipo_servico.value,
                DESCRICAO: form.descricao.value,
                STATUS_ORCAMENTO: 'Não Visualizado',
                fk_cod_usuario: perfil.COD_USUARIO
            };

            const { error } = await supabase.from('tb_orcamento').insert(orcamentoData);

            if (error) throw error;

            if (typeof showCustomModal === 'function') {
                await showCustomModal('Pedido enviado com sucesso! Acompanhe no seu Perfil.', 'Sucesso');
            } else {
                alert('Pedido enviado com sucesso!');
            }

            form.reset();
            window.location.href = 'consultar_orcamento.html';

        } catch (error) {
            console.error(error);
            if (typeof showCustomModal === 'function') {
                // Se for erro de validação, mostra modal. Se for erro de sistema, mostra também.
                showCustomModal(error.message, 'Atenção');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = btnOriginalText;
        }
    });
});