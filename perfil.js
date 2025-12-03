document.addEventListener('DOMContentLoaded', async() => {
    if (typeof supabase === 'undefined') { console.error('Supabase off'); return; }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Faça login para acessar seu perfil.', 'Acesso Negado');
        else alert('Faça login para acessar seu perfil.');
        window.location.href = 'index.html';
        return;
    }

    const { data: perfil, error } = await supabase.from('usu_cadastro').select('*').eq('EMAIL_USU', user.email).single();

    if (perfil) {
        document.getElementById('nome').value = perfil.NOME_USU || '';
        document.getElementById('email').value = perfil.EMAIL_USU || user.email; // Email vem do banco
        document.getElementById('cpf').value = perfil.CPF_CNPJ_USU || '';
        document.getElementById('endereco').value = perfil.END_USU || '';
    } else {
        document.getElementById('email').value = user.email;
    }

    // Configura botões de edição (IGNORA O CAMPO DE EMAIL)
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.currentTarget.parentElement.querySelector('input');
            // Impede edição do email
            if (input && input.id !== 'email') {
                input.removeAttribute('readonly');
                input.focus();
                input.style.borderColor = '#f0c029';
            }
        });
    });

    const form = document.getElementById('form-perfil');
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const novoNome = document.getElementById('nome').value;
        const novoEndereco = document.getElementById('endereco').value;
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;

        // Atualiza dados cadastrais
        const { error: updateError } = await supabase
            .from('usu_cadastro')
            .update({ NOME_USU: novoNome, END_USU: novoEndereco })
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            if (typeof showCustomModal === 'function') showCustomModal('Erro ao atualizar: ' + updateError.message, 'Erro');
            return;
        }

        // Atualiza Senha e Desloga
        if (novaSenha) {
            if (novaSenha.length < 6) {
                if (typeof showCustomModal === 'function') showCustomModal('Senha muito curta.', 'Erro');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                if (typeof showCustomModal === 'function') showCustomModal('Senhas não coincidem.', 'Erro');
                return;
            }

            const { error: passError } = await supabase.auth.updateUser({ password: novaSenha });

            if (passError) {
                showCustomModal('Erro ao alterar senha: ' + passError.message, 'Erro');
            } else {
                await showCustomModal('Senha alterada com sucesso! Você será deslogado de todas as sessões.', 'Sucesso');
                await supabase.auth.signOut(); // Logout forçado
                window.location.href = 'index.html';
                return;
            }
        }

        if (typeof showCustomModal === 'function') await showCustomModal('Perfil atualizado com sucesso.', 'Sucesso');

        // Bloqueia inputs
        document.querySelectorAll('#form-perfil input[type="text"]').forEach(i => {
            i.setAttribute('readonly', true);
            i.style.borderColor = '#555';
        });
    });
});