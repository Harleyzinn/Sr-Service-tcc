document.addEventListener('DOMContentLoaded', async() => {
    // CORREÇÃO: Usa o cliente inicializado globalmente
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        alert('Erro de sistema: Conexão com banco de dados falhou.');
        return;
    }

    // --- MÁSCARA DE CPF/CNPJ (Adicionada e Corrigida) ---
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não é dígito

            if (value.length > 14) value = value.slice(0, 14); // Limite

            if (value.length <= 11) {
                // Máscara CPF: 000.000.000-00
                value = value.replace(/(\d{3})(\d)/, "$1.$2");
                value = value.replace(/(\d{3})(\d)/, "$1.$2");
                value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            } else {
                // Máscara CNPJ: 00.000.000/0000-00
                value = value.replace(/^(\d{2})(\d)/, "$1.$2");
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
                value = value.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
            }
            e.target.value = value;
        });
    }

    // Verifica Login
    const { data: { user } } = await sbClient.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Faça login para acessar seu perfil.', 'Acesso Negado');
        else alert('Faça login para acessar seu perfil.');
        window.location.href = 'index.html';
        return;
    }

    // Carrega Dados do Perfil
    const { data: perfil, error } = await sbClient
        .from('usu_cadastro')
        .select('*')
        .eq('EMAIL_USU', user.email)
        .single();

    if (perfil) {
        document.getElementById('nome').value = perfil.NOME_USU || '';
        document.getElementById('email').value = perfil.EMAIL_USU || user.email;
        document.getElementById('cpf').value = perfil.CPF_CNPJ_USU || '';
        document.getElementById('endereco').value = perfil.END_USU || '';
    } else {
        document.getElementById('email').value = user.email;
    }

    // Configura botões de edição
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.currentTarget.parentElement.querySelector('input');
            if (input && input.id !== 'email') {
                input.removeAttribute('readonly');
                input.focus();
                input.style.borderColor = '#f0c029';
            } else {
                if (typeof showCustomModal === 'function') showCustomModal('O e-mail não pode ser alterado.', 'Aviso');
            }
        });
    });

    // Salvar Alterações
    const form = document.getElementById('form-perfil');
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value; // Pega o valor com a máscara
        const endereco = document.getElementById('endereco').value;
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;

        // 1. Atualiza Dados Cadastrais
        const { error: updateError } = await sbClient
            .from('usu_cadastro')
            .update({
                NOME_USU: nome,
                CPF_CNPJ_USU: cpf, // Envia o CPF atualizado
                END_USU: endereco
            })
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            console.error(updateError);
            if (typeof showCustomModal === 'function') showCustomModal('Erro ao atualizar: ' + updateError.message, 'Erro');
            return;
        }

        // 2. Atualiza Senha (se preenchida)
        if (novaSenha) {
            if (novaSenha.length < 6) {
                if (typeof showCustomModal === 'function') showCustomModal('Senha muito curta.', 'Erro');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                if (typeof showCustomModal === 'function') showCustomModal('Senhas não coincidem.', 'Erro');
                return;
            }

            const { error: passError } = await sbClient.auth.updateUser({ password: novaSenha });

            if (passError) {
                showCustomModal('Erro ao alterar senha: ' + passError.message, 'Erro');
            } else {
                await showCustomModal('Senha alterada com sucesso! Você será deslogado.', 'Sucesso');
                await sbClient.auth.signOut();
                window.location.href = 'index.html';
                return;
            }
        }

        if (typeof showCustomModal === 'function') await showCustomModal('Perfil atualizado com sucesso.', 'Sucesso');

        // Bloqueia inputs novamente
        document.querySelectorAll('#form-perfil input[type="text"]').forEach(i => {
            i.setAttribute('readonly', true);
            i.style.borderColor = '#555';
        });
    });
});