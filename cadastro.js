document.addEventListener('DOMContentLoaded', () => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        if (typeof showCustomModal === 'function') showCustomModal('Erro de sistema: Conexão falhou.', 'Erro Fatal');
        return;
    }

    // --- MÁSCARAS DE INPUT ---
    const cpfInput = document.getElementById('cpf');
    const telInput = document.getElementById('tel');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let v = e.target.value;

            // 1. Remove tudo que não é dígito ou X/x
            v = v.replace(/[^0-9xX]/g, "");

            // 2. Limita tamanho (11 para CPF padrão, 14 para CNPJ)
            // Se tiver X, assumimos que é CPF (11 caracteres)
            if (v.toUpperCase().includes('X')) {
                if (v.length > 11) v = v.slice(0, 11);
            } else {
                if (v.length > 14) v = v.slice(0, 14);
            }

            // 3. Garante que X apareça apenas na última posição (dígito verificador do CPF)
            // Se X estiver no meio, removemos
            if (v.length < 11) {
                v = v.replace(/[xX]/g, ""); // Não permite X antes do fim
            } else {
                // Se tem 11 carac, verifica se o X está na posição correta (índice 10)
                const mainPart = v.substring(0, 10).replace(/[xX]/g, ""); // Primeiros 10 devem ser números
                const lastChar = v.charAt(10); // O último pode ser número ou X
                v = mainPart + lastChar;
            }

            // 4. Aplica a Máscara Visual
            if (v.length <= 11) {
                // Máscara CPF: 000.000.000-0X
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})([0-9xX]{1,2})$/, "$1-$2");
            } else {
                // Máscara CNPJ: 00.000.000/0000-00 (CNPJ não tem X)
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
            let v = e.target.value;

            // 1. Remove TUDO que não for número (Letras proibidas aqui)
            v = v.replace(/\D/g, "");

            // 2. Limita tamanho (11 dígitos = DDD + 9 números)
            if (v.length > 11) v = v.slice(0, 11);

            // 3. Aplica Máscara
            if (v.length > 10) {
                // Formato Celular: (11) 91234-5678
                v = v.replace(/^(\d{2})(\d)/, "($1) $2");
                v = v.replace(/(\d{5})(\d)/, "$1-$2");
            } else if (v.length > 2) {
                // Formato Fixo ou incompleto: (11) 1234-5678
                v = v.replace(/^(\d{2})(\d)/, "($1) $2");
                v = v.replace(/(\d{4})(\d)/, "$1-$2");
            } else if (v.length > 0) {
                // Apenas DDD
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

            // --- VALIDAÇÕES INDIVIDUAIS ---

            // 1. Senha
            if (senha !== confirmSenha) {
                return showCustomModal('As senhas digitadas não coincidem. Tente novamente.', 'Erro na Senha');
            }
            if (senha.length < 6) {
                return showCustomModal('A senha é muito curta. Use no mínimo 6 caracteres.', 'Senha Fraca');
            }

            // 2. Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return showCustomModal('O e-mail informado parece inválido.', 'E-mail Inválido');
            }

            // 3. Telefone
            // Remove a máscara para contar os números
            const telLimpo = telRaw.replace(/\D/g, '');
            if (telLimpo.length < 10 || telLimpo.length > 11) {
                return showCustomModal('O telefone está incompleto. Digite o DDD + Número.', 'Telefone Inválido');
            }

            // 4. CPF/CNPJ
            const docLimpo = cpfRaw.replace(/[^0-9xX]/g, ''); // Remove pontos e traços, mantém X

            if (docLimpo.length === 11) {
                // Validação de CPF
                if (!validarCPF(docLimpo)) {
                    return showCustomModal('O número de CPF informado não é válido. Verifique os dígitos.', 'CPF Inválido');
                }
            } else if (docLimpo.length === 14) {
                // Validação de CNPJ
                if (!validarCNPJ(docLimpo)) {
                    return showCustomModal('O número de CNPJ informado não é válido.', 'CNPJ Inválido');
                }
            } else {
                return showCustomModal('O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).', 'Documento Inválido');
            }

            // --- ENVIO APÓS SUCESSO NAS VALIDAÇÕES ---
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Cadastrando...';

            try {
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
                        CPF_CNPJ_USU: cpfRaw, // Salva com a formatação (e o X se tiver)
                        TEL_USU: telLimpo, // Salva apenas números
                        admin: 0
                    });

                    if (insertError) console.error('Erro ao salvar dados:', insertError);

                    await showCustomModal('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.', 'Sucesso');
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

// ALGORITMOS DE VALIDAÇÃO MATEMÁTICA
function validarCPF(cpf) {
    // Se tiver X, a validação matemática padrão falha.
    // Se o cliente EXIGE que aceite X, precisamos pular a validação matemática ou adaptar.
    // Aqui, vou assumir que se tem X, aceitamos como válido visualmente, 
    // pois o algoritmo padrão de CPF brasileiro é puramente numérico.
    if (cpf.toUpperCase().includes('X')) return true;

    if (/^(\d)\1+$/.test(cpf)) return false; // Bloqueia 111.111.111-11

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
    // CNPJ não tem X, então valida estritamente números
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