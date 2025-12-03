document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o cliente Supabase foi carregado
    const sbClient = window.supabase || supabase;
    if (!sbClient) {
        console.error('Erro: Supabase client não encontrado.');
        return;
    }

    // --- MÁSCARAS DE INPUT (Visual) ---
    const cpfInput = document.getElementById('cpf');
    const telInput = document.getElementById('tel');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length > 14) value = value.slice(0, 14); // Limite CNPJ

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

    // --- LÓGICA DE SUBMISSÃO E VALIDAÇÃO ---
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

            // 1. Validação de Senhas
            if (senha !== confirmSenha) {
                return showCustomModal('As senhas não conferem.', 'Erro de Validação');
            }
            if (senha.length < 6) {
                return showCustomModal('A senha deve ter no mínimo 6 caracteres.', 'Erro de Validação');
            }

            // 2. Validação de E-mail (Regex Simples)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return showCustomModal('Por favor, insira um endereço de e-mail válido.', 'Erro de Validação');
            }

            // 3. Validação de Telefone (Tamanho e Formato)
            const telefoneLimpo = telRaw.replace(/\D/g, '');
            if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
                return showCustomModal('O telefone deve ter 10 ou 11 dígitos (DDD + Número).', 'Erro de Validação');
            }

            // 4. Validação de CPF ou CNPJ (Algoritmo Real)
            const cpfCnpjLimpo = cpfRaw.replace(/\D/g, '');

            if (cpfCnpjLimpo.length === 11) {
                if (!validarCPF(cpfCnpjLimpo)) {
                    return showCustomModal('O CPF informado é inválido.', 'Erro de Validação');
                }
            } else if (cpfCnpjLimpo.length === 14) {
                if (!validarCNPJ(cpfCnpjLimpo)) {
                    return showCustomModal('O CNPJ informado é inválido.', 'Erro de Validação');
                }
            } else {
                return showCustomModal('O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos).', 'Erro de Validação');
            }

            // --- SE PASSOU POR TUDO, ENVIA AO SUPABASE ---

            const btnSubmit = form.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Cadastrando...';

            try {
                // A. Cria Auth User
                const { data: authData, error: authError } = await sbClient.auth.signUp({
                    email: email,
                    password: senha
                });

                if (authError) {
                    throw new Error(authError.message);
                }

                // Verifica se o usuário já existe mas não confirmou email (Supabase às vezes retorna user null mas sem erro explícito se config for confirm email)
                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    throw new Error('Este e-mail já está cadastrado.');
                }

                // B. Salva no Banco de Dados (Tabela usu_cadastro)
                if (authData.user) {
                    const { error: insertError } = await sbClient.from('usu_cadastro').insert({
                        NOME_USU: nome,
                        EMAIL_USU: email,
                        SENHA_USU: '********', // Não salvamos a senha real no banco de dados, apenas no Auth
                        END_USU: endereco,
                        CPF_CNPJ_USU: cpfRaw, // Salva com formatação
                        TEL_USU: telefoneLimpo, // Salva apenas números (BIGINT)
                        admin: 0
                    });

                    if (insertError) {
                        // Se falhar ao salvar no banco, idealmente deveríamos apagar o Auth User para não ficar órfão,
                        // mas por simplicidade vamos apenas avisar.
                        throw new Error('Erro ao salvar perfil: ' + insertError.message);
                    }

                    await showCustomModal('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta (se necessário).', 'Sucesso');
                    window.location.href = 'index.html'; // Redireciona para login
                }

            } catch (error) {
                console.error(error);
                let msg = error.message;
                if (msg.includes('already registered')) msg = 'Este e-mail já está em uso.';
                await showCustomModal(msg, 'Erro no Cadastro');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = originalText;
            }
        });
    }
});

// --- FUNÇÕES AUXILIARES DE VALIDAÇÃO ---

function validarCPF(cpf) {
    if (/^(\d)\1+$/.test(cpf)) return false; // Elimina CPFs com todos os dígitos iguais (ex: 111.111.111-11)

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);

    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);

    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

function validarCNPJ(cnpj) {
    if (/^(\d)\1+$/.test(cnpj)) return false; // Elimina CNPJs com todos os dígitos iguais

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
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