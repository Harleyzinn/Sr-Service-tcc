document.addEventListener('DOMContentLoaded', () => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        if (typeof showCustomModal === 'function') showCustomModal('Erro de sistema: Conexão falhou.', 'Erro Fatal');
        return;
    }

    // --- MÁSCARAS (Mantidas) ---
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
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d)/, "($1) $2");
                value = value.replace(/(\d{5})(\d)/, "$1-$2");
            } else {
                value = value.replace(/^(\d{2})(\d)/, "($1) $2");
                value = value.replace(/(\d{4})(\d)/, "$1-$2");
            }
            e.target.value = value;
        });
    }

    // --- SUBMISSÃO ---
    const form = document.getElementById('form-cadastro');
    if (form) {
        form.addEventListener('submit', async(e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const confirmSenha = document.getElementById('confirmSenha').value;
            const cpfRaw = document.getElementById('cpf').value;
            const telRaw = document.getElementById('tel').value;
            const endereco = document.getElementById('endereco').value.trim();

            if (senha !== confirmSenha) return showCustomModal('As senhas não conferem.', 'Erro');
            if (senha.length < 6) return showCustomModal('A senha deve ter no mínimo 6 caracteres.', 'Erro');

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return showCustomModal('E-mail inválido.', 'Erro');

            const telLimpo = telRaw.replace(/\D/g, '');
            if (telLimpo.length < 10 || telLimpo.length > 11) return showCustomModal('Telefone inválido.', 'Erro');

            const docLimpo = cpfRaw.replace(/\D/g, '');
            if (docLimpo.length === 11) {
                if (!validarCPF(docLimpo)) return showCustomModal('CPF inválido.', 'Erro');
            } else if (docLimpo.length === 14) {
                if (!validarCNPJ(docLimpo)) return showCustomModal('CNPJ inválido.', 'Erro');
            } else {
                return showCustomModal('Documento inválido.', 'Erro');
            }

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Cadastrando...';

            try {
                // LÓGICA DE URL DINÂMICA
                // Pega a URL atual (seja localhost ou github) e remove o nome do arquivo atual
                // Ex: http://127.0.0.1:5500/cadastro.html vira http://127.0.0.1:5500/
                let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

                // Se a URL não terminar com /, adiciona (para garantir)
                if (!baseUrl.endsWith('/')) baseUrl += '/';

                // 1. Cria usuário no Auth
                const { data: authData, error: authError } = await sbClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        // Redireciona para a home do mesmo lugar onde o usuário está agora
                        emailRedirectTo: baseUrl + 'index.html'
                    }
                });

                if (authError) throw new Error(authError.message);

                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    throw new Error('Este e-mail já está cadastrado.');
                }

                // 2. Salva perfil no Banco
                if (authData.user) {
                    const { error: insertError } = await sbClient.from('usu_cadastro').insert({
                        NOME_USU: nome,
                        EMAIL_USU: email,
                        SENHA_USU: '********',
                        END_USU: endereco,
                        CPF_CNPJ_USU: cpfRaw,
                        TEL_USU: telLimpo,
                        admin: 0
                    });

                    if (insertError) console.error('Erro ao salvar dados:', insertError);

                    await showCustomModal('Cadastro realizado! Verifique seu e-mail para confirmar.', 'Sucesso');
                    window.location.href = 'index.html';
                }

            } catch (error) {
                console.error(error);
                let msg = error.message;
                if (msg.includes('already registered')) msg = 'Este e-mail já está em uso.';
                await showCustomModal(msg, 'Erro no Cadastro');
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }
});

// Funções de Validação (Mantidas)
function validarCPF(cpf) {
    if (/^(\d)\1+$/.test(cpf)) return false;
    let soma = 0,
        resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

function validarCNPJ(cnpj) {
    if (/^(\d)\1+$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0,
        pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;
    tamanho += 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;
    return true;
}