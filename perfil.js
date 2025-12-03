document.addEventListener('DOMContentLoaded', async() => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        alert('Erro de sistema: Conexão com banco de dados falhou.');
        return;
    }

    // --- MÁSCARA DE CPF/CNPJ ---
    function aplicarMascaraCpf(value) {
        value = value.replace(/\D/g, ""); // Remove letras
        if (value.length > 14) value = value.slice(0, 14);

        if (value.length <= 11) {
            // Máscara CPF
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        } else {
            // Máscara CNPJ
            value = value.replace(/^(\d{2})(\d)/, "$1.$2");
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
            value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
            value = value.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
        }
        return value;
    }

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = aplicarMascaraCpf(e.target.value);
        });
    }

    // --- CARREGAMENTO DE DADOS ---
    const { data: { user } } = await sbClient.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Faça login para acessar seu perfil.', 'Acesso Negado');
        window.location.href = 'index.html';
        return;
    }

    const { data: perfil, error } = await sbClient
        .from('usu_cadastro')
        .select('*')
        .eq('EMAIL_USU', user.email)
        .single();

    if (perfil) {
        document.getElementById('nome').value = perfil.NOME_USU || '';
        document.getElementById('email').value = perfil.EMAIL_USU || user.email;
        document.getElementById('cpf').value = perfil.CPF_CNPJ_USU ? aplicarMascaraCpf(perfil.CPF_CNPJ_USU) : '';
        document.getElementById('endereco').value = perfil.END_USU || '';
    } else {
        document.getElementById('email').value = user.email;
    }

    // Botões de Edição
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

    // --- SALVAR (COM VALIDAÇÃO RIGOROSA) ---
    const form = document.getElementById('form-perfil');
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const cpfRaw = document.getElementById('cpf').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;

        // 1. VALIDAÇÃO DE CAMPOS VAZIOS
        if (!nome || !cpfRaw || !endereco) {
            if (typeof showCustomModal === 'function') showCustomModal('Todos os campos (Nome, CPF e Endereço) são obrigatórios e não podem ficar em branco.', 'Dados Incompletos');
            else alert('Preencha todos os campos.');
            return;
        }

        // 2. VALIDAÇÃO DE NOME REAL (Mínimo 2 palavras)
        if (nome.split(' ').length < 2) {
            if (typeof showCustomModal === 'function') showCustomModal('Por favor, insira seu nome completo (Nome e Sobrenome).', 'Nome Inválido');
            return;
        }

        // 3. VALIDAÇÃO DE ENDEREÇO REAL (Mínimo de caracteres)
        if (endereco.length < 5) {
            if (typeof showCustomModal === 'function') showCustomModal('O endereço inserido parece incompleto. Detalhe rua, número e bairro.', 'Endereço Inválido');
            return;
        }

        // 4. VALIDAÇÃO DE CPF/CNPJ MATEMÁTICA
        const cpfLimpo = cpfRaw.replace(/\D/g, '');

        if (cpfLimpo.length === 11) {
            if (!validarCPF(cpfLimpo)) {
                if (typeof showCustomModal === 'function') showCustomModal('O CPF informado é inválido. Verifique os números.', 'CPF Inválido');
                return;
            }
        } else if (cpfLimpo.length === 14) {
            if (!validarCNPJ(cpfLimpo)) {
                if (typeof showCustomModal === 'function') showCustomModal('O CNPJ informado é inválido.', 'CNPJ Inválido');
                return;
            }
        } else {
            if (typeof showCustomModal === 'function') showCustomModal('O documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.', 'Documento Inválido');
            return;
        }

        // Se passou em tudo, salva no banco
        const { error: updateError } = await sbClient
            .from('usu_cadastro')
            .update({
                NOME_USU: nome,
                CPF_CNPJ_USU: cpfRaw,
                END_USU: endereco
            })
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            if (typeof showCustomModal === 'function') showCustomModal('Erro ao atualizar: ' + updateError.message, 'Erro');
            return;
        }

        if (novaSenha) {
            if (novaSenha.length < 6) {
                if (typeof showCustomModal === 'function') showCustomModal('A nova senha deve ter no mínimo 6 caracteres.', 'Senha Curta');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                if (typeof showCustomModal === 'function') showCustomModal('As novas senhas não coincidem.', 'Erro de Senha');
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

        document.querySelectorAll('#form-perfil input[type="text"]').forEach(i => {
            i.setAttribute('readonly', true);
            i.style.borderColor = '#555';
        });
    });
});

// --- ALGORITMOS DE VALIDAÇÃO ---
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