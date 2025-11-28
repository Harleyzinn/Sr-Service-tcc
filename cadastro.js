document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error('Erro: Supabase client não encontrado na página de cadastro.');
        return;
    }

    // --- MÁSCARAS DE INPUT ---
    const cpfInput = document.getElementById('cpf');
    const telInput = document.getElementById('tel');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length > 14) value = value.slice(0, 14);
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, "$1.$2");
                value = value.replace(/(\d{3})(\d)/, "$1.$2");
                value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            } else {
                value = value.replace(/^(\d{2})(\d)/, "$1.$2");
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
                value = value.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
            }
            e.target.value = value;
        });
    }

    if (telInput) {
        telInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
            value = value.replace(/(\d)(\d{4})$/, "$1-$2");
            e.target.value = value;
        });
    }

    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async(event) => {
        event.preventDefault();

        const nome = document.querySelector('[name="nome"]').value;
        const email = document.querySelector('[name="email"]').value;
        const senha = document.querySelector('[name="senha"]').value;
        const Rsenha = document.querySelector('[name="Rsenha"]').value;
        const endereco = document.querySelector('[name="endereco"]').value;

        const cpfRaw = document.querySelector('[name="cpf"]').value;
        const telefoneRaw = document.querySelector('[name="tel"]').value.replace(/\D/g, "");

        if (senha.length < 6) {
            if (typeof showCustomModal === 'function') return showCustomModal('A senha deve ter no mínimo 6 caracteres.', 'Senha Fraca');
            return alert('A senha deve ter no mínimo 6 caracteres.');
        }

        if (senha !== Rsenha) {
            if (typeof showCustomModal === 'function') return showCustomModal('As senhas digitadas não coincidem.', 'Erro na Senha');
            return alert('As senhas não coincidem.');
        }

        // 1. Cria usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha });

        if (authError) {
            if (typeof showCustomModal === 'function') return showCustomModal('Erro ao criar conta: ' + authError.message, 'Falha no Cadastro');
            return alert('Erro: ' + authError.message);
        }

        // --- CORREÇÃO AQUI ---
        // Se a sessão for nula, significa que o e-mail PRECISA ser confirmado.
        // Paramos aqui e não tentamos inserir no banco nem redirecionar para perfil.
        if (!authData.session) {
            if (typeof showCustomModal === 'function') {
                await showCustomModal(
                    'Cadastro realizado com sucesso!\n\nPor favor, verifique sua caixa de entrada (e spam) para confirmar seu e-mail antes de fazer login.',
                    'Confirmação Necessária'
                );
            } else {
                alert('Verifique seu e-mail para confirmar o cadastro.');
            }
            // Redireciona para a HOME (onde ele pode logar depois de confirmar)
            // Evita o erro de "Acesso Negado" na página de perfil
            window.location.href = 'index.html';
            return;
        }

        // 2. Se a sessão EXISTE (Email Confirmado ou Login Automático Ativo)
        if (authData.user && authData.session) {
            const { error: insertError } = await supabase.from('usu_cadastro').insert({
                NOME_USU: nome,
                EMAIL_USU: email,
                SENHA_USU: '********',
                END_USU: endereco,
                CPF_CNPJ_USU: cpfRaw,
                TEL_USU: telefoneRaw,
                admin: 0
            });

            if (insertError) {
                console.error('Detalhe do erro:', insertError);
                if (typeof showCustomModal === 'function') {
                    await showCustomModal('Conta criada, mas houve um erro ao salvar dados: ' + insertError.message, 'Atenção');
                }
                // Redireciona para perfil para tentar arrumar
                window.location.href = 'perfil.html';
            } else {
                if (typeof showCustomModal === 'function') {
                    await showCustomModal('Cadastro realizado com sucesso! Você já está logado.', 'Bem-vindo');
                }
                // Redireciona para perfil (sucesso)
                window.location.href = 'perfil.html';
            }
        }
    });
});