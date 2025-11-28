document.addEventListener('DOMContentLoaded', async() => {
    // 1. Verifica se o usuário está logado
    if (typeof supabase === 'undefined') { console.error('Supabase off'); return; }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Faça login para acessar seu perfil.', 'Acesso Negado');
        else alert('Faça login para acessar seu perfil.');
        window.location.href = 'index.html';
        return;
    }

    // 2. Busca dados do perfil
    const { data: perfil, error } = await supabase
        .from('usu_cadastro')
        .select('*')
        .eq('EMAIL_USU', user.email)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil:', error);
        if (typeof showCustomModal === 'function') showCustomModal('Erro ao carregar dados: ' + error.message, 'Erro');
    }

    // 3. Preenche os campos (trata nulos com string vazia)
    if (perfil) {
        document.getElementById('nome').value = perfil.NOME_USU || '';
        document.getElementById('email').value = perfil.EMAIL_USU || user.email;
        document.getElementById('cpf').value = perfil.CPF_CNPJ_USU || '';
        document.getElementById('endereco').value = perfil.END_USU || '';
    }

    // 4. Configura botões de edição (Lápis)
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Encontra o input vizinho dentro do wrapper
            const input = e.currentTarget.parentElement.querySelector('input');
            if (input) {
                input.removeAttribute('readonly');
                input.focus();
                input.style.borderColor = '#f0c029'; // Destaque visual
            }
        });
    });

    // 5. Salvar Alterações
    const form = document.getElementById('form-perfil');
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const novoNome = document.getElementById('nome').value;
        const novoCpf = document.getElementById('cpf').value;
        const novoEndereco = document.getElementById('endereco').value;
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;

        // Atualiza dados cadastrais
        const updates = {
            NOME_USU: novoNome,
            CPF_CNPJ_USU: novoCpf,
            END_USU: novoEndereco,
            // Mantemos email e admin inalterados por segurança aqui
        };

        let msg = '';

        // 1. Atualiza Tabela usu_cadastro
        const { error: updateError } = await supabase
            .from('usu_cadastro')
            .update(updates)
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            if (typeof showCustomModal === 'function') showCustomModal('Erro ao atualizar perfil: ' + updateError.message, 'Erro');
            return;
        } else {
            msg += 'Dados atualizados com sucesso. ';
        }

        // 2. Atualiza Senha (se preenchida)
        if (novaSenha) {
            if (novaSenha.length < 6) {
                if (typeof showCustomModal === 'function') showCustomModal('A senha deve ter no mínimo 6 caracteres.', 'Senha Fraca');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                if (typeof showCustomModal === 'function') showCustomModal('As senhas não coincidem.', 'Erro na Senha');
                return;
            }

            const { error: passError } = await supabase.auth.updateUser({ password: novaSenha });

            if (passError) {
                msg += '\n\nATENÇÃO: Erro ao atualizar senha (' + passError.message + ').';
            } else {
                msg += '\nSenha alterada com sucesso.';
                // Limpa campos de senha
                document.getElementById('nova_senha').value = '';
                document.getElementById('confirma_senha').value = '';
            }
        }

        // Feedback final
        if (typeof showCustomModal === 'function') {
            await showCustomModal(msg, 'Sucesso');
        } else {
            alert(msg);
        }

        // Bloqueia inputs novamente
        document.querySelectorAll('#form-perfil input[type="text"]').forEach(i => {
            i.setAttribute('readonly', true);
            i.style.borderColor = '#555';
        });
    });
});