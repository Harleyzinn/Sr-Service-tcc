document.addEventListener('DOMContentLoaded', () => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        if (typeof showCustomModal === 'function') showCustomModal('Erro de sistema: Conexão falhou.', 'Erro Fatal');
        return;
    }

    // --- MÁSCARAS ---
    const cpfInput = document.getElementById('cpf');
    const telInput = document.getElementById('tel');
    const nomeInput = document.getElementById('nome');

    if (nomeInput) {
        // Restrição de Caracteres no Nome (Apenas Letras)
        nomeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
        });
    }

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let v = e.target.value;
            // Remove tudo que não é dígito ou X (para validação frouxa se necessário, mas idealmente só números)
            v = v.replace(/[^0-9xX]/g, "");

            if (v.toUpperCase().includes('X')) {
                if (v.length > 11) v = v.slice(0, 11);
            } else {
                if (v.length > 14) v = v.slice(0, 14);
            }

            // Garante X apenas no final se for CPF
            if (v.length < 11) {
                v = v.replace(/[xX]/g, "");
            } else {
                const mainPart = v.substring(0, 10).replace(/[xX]/g, "");
                const lastChar = v.charAt(10);
                v = mainPart + lastChar;
            }

            // Máscaras
            if (v.length <= 11) {
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})([0-9xX]{1,2})$/, "$1-$2");
            } else {
                v = v.replace(/^(\d{2})(\d)/, "$1.$2");
                v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
                v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
            }
            e.target.value = v;
        });
    }

    if (telInput) {
        telInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            // Limita tamanho
            if (v.length > 11) v = v.slice(0, 11);

            // Máscara
            if (v.length > 10) {
                v = v.replace(/^(\d{2})(\d)/, "($1) $2");
                v = v.replace(/(\d{5})(\d)/, "$1-$2");
            } else if (v.length > 2) {
                v = v.replace(/^(\d{2})(\d)/, "($1) $2");
                v = v.replace(/(\d{4})(\d)/, "$1-$2");
            } else if (v.length > 0) {
                v = v.replace(/^(\d{0,2})/, "($1");
            }
            e.target.value = v;
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

            // VALIDAÇÕES

            // 1. Nome (Tamanho e Formato)
            if (nome.length < 3 || nome.split(' ').length < 2) {
                return showCustomModal('Por favor, digite seu nome completo (Nome e Sobrenome).', 'Nome Inválido');
            }

            // 2. Senha
            if (senha !== confirmSenha) return showCustomModal('As senhas não conferem.', 'Erro');
            if (senha.length < 6) return showCustomModal('A senha deve ter no mínimo 6 caracteres.', 'Erro');

            // 3. E-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return showCustomModal('E-mail inválido.', 'Erro');

            // 4. Telefone
            const telLimpo = telRaw.replace(/\D/g, '');
            if (telLimpo.length < 10) return showCustomModal('Telefone inválido (mínimo 10 dígitos).', 'Erro');

            // 5. CPF/CNPJ
            const docLimpo = cpfRaw.replace(/[^0-9xX]/g, '');
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
            btn.innerText = 'Verificando...';

            try {
                // Verificação de Duplicidade
                const { data: cpfExists, error: searchError } = await sbClient
                    .from('usu_cadastro')
                    .select('COD_USUARIO')
                    .eq('CPF_CNPJ_USU', cpfRaw)
                    .maybeSingle();

                if (cpfExists) {
                    throw new Error('Este CPF ou CNPJ já está cadastrado.');
                }

                // Cria usuário Auth
                btn.innerText = 'Cadastrando...';
                let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
                if (!baseUrl.endsWith('/')) baseUrl += '/';

                const { data: authData, error: authError } = await sbClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        emailRedirectTo: baseUrl + 'index.html'
                    }
                });

                if (authError) throw new Error(authError.message);

                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    throw new Error('Este e-mail já está cadastrado.');
                }

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

function validarCPF(cpf) {
    if (cpf.toUpperCase().includes('X')) return true;
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
    if (/[^0-9]/.test(cnpj)) return false;
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