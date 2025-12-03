document.addEventListener('DOMContentLoaded', async() => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        alert('Erro de sistema: Conexão com banco de dados falhou.');
        return;
    }

    // --- MÁSCARAS DE INPUT (Visual) ---

    // 1. CPF/CNPJ
    function aplicarMascaraCpf(value) {
        value = value.replace(/\D/g, "");
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
        return value;
    }

    // 2. Telefone
    function aplicarMascaraTelefone(value) {
        value = value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            // (11) 91234-5678
            value = value.replace(/^(\d{2})(\d)/, "($1) $2");
            value = value.replace(/(\d{5})(\d)/, "$1-$2");
        } else {
            // (11) 1234-5678
            value = value.replace(/^(\d{2})(\d)/, "($1) $2");
            value = value.replace(/(\d{4})(\d)/, "$1-$2");
        }
        return value;
    }

    // Aplica máscaras nos eventos de input
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = aplicarMascaraCpf(e.target.value);
        });
    }

    const telInput = document.getElementById('tel');
    if (telInput) {
        telInput.addEventListener('input', (e) => {
            e.target.value = aplicarMascaraTelefone(e.target.value);
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
        document.getElementById('tel').value = perfil.TEL_USU ? aplicarMascaraTelefone(perfil.TEL_USU.toString()) : '';
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

    // --- SALVAR COM VALIDAÇÃO PERSONALIZADA ---
    const form = document.getElementById('form-perfil');
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const cpfRaw = document.getElementById('cpf').value.trim();
        const telRaw = document.getElementById('tel').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;

        // 1. Validação de Campos Vazios
        if (!nome || !cpfRaw || !telRaw || !endereco) {
            showCustomModal('Todos os campos são obrigatórios. Por favor, preencha tudo.', 'Campos Vazios');
            return;
        }

        // 2. Validação de Nome (Sem números ou símbolos)
        // Permite letras (com acentos) e espaços.
        const nomeRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
        if (!nomeRegex.test(nome)) {
            showCustomModal('O nome contém caracteres inválidos. Use apenas letras e espaços.', 'Nome Inválido');
            return;
        }
        if (nome.split(' ').length < 2) {
            showCustomModal('Por favor, informe seu nome completo (Nome e Sobrenome).', 'Nome Incompleto');
            return;
        }

        // 3. Validação de Telefone (Tamanho)
        const telLimpo = telRaw.replace(/\D/g, '');
        if (telLimpo.length < 10 || telLimpo.length > 11) {
            showCustomModal('O telefone informado é inválido. Digite o DDD + Número.', 'Telefone Inválido');
            return;
        }

        // 4. Validação de CPF/CNPJ (Matemática)
        const cpfLimpo = cpfRaw.replace(/\D/g, '');
        if (cpfLimpo.length === 11) {
            if (!validarCPF(cpfLimpo)) {
                showCustomModal('O CPF informado não é válido. Verifique os números.', 'CPF Inválido');
                return;
            }
        } else if (cpfLimpo.length === 14) {
            if (!validarCNPJ(cpfLimpo)) {
                showCustomModal('O CNPJ informado não é válido. Verifique os números.', 'CNPJ Inválido');
                return;
            }
        } else {
            showCustomModal('O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).', 'Documento Inválido');
            return;
        }

        // --- SE PASSOU EM TUDO, SALVA NO BANCO ---
        const { error: updateError } = await sbClient
            .from('usu_cadastro')
            .update({
                NOME_USU: nome,
                CPF_CNPJ_USU: cpfRaw, // Salva formatado
                TEL_USU: telLimpo, // Salva limpo (apenas números)
                END_USU: endereco
            })
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            showCustomModal('Erro ao salvar no banco de dados: ' + updateError.message, 'Erro de Sistema');
            return;
        }

        // Atualização de Senha (Opcional)
        if (novaSenha) {
            if (novaSenha.length < 6) {
                showCustomModal('A nova senha deve ter no mínimo 6 caracteres.', 'Senha Fraca');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                showCustomModal('A confirmação de senha não confere.', 'Senhas Divergentes');
                return;
            }

            const { error: passError } = await sbClient.auth.updateUser({ password: novaSenha });

            if (passError) {
                showCustomModal('Erro ao atualizar senha: ' + passError.message, 'Erro');
            } else {
                await showCustomModal('Senha alterada com sucesso! Você será desconectado.', 'Sucesso');
                await sbClient.auth.signOut();
                window.location.href = 'index.html';
                return;
            }
        }

        // Sucesso Final
        await showCustomModal('Seus dados foram atualizados com sucesso!', 'Perfil Salvo');

        // Bloqueia inputs novamente para indicar que salvou
        document.querySelectorAll('#form-perfil input').forEach(i => {
            if (i.id !== 'nova_senha' && i.id !== 'confirma_senha') {
                i.setAttribute('readonly', true);
                i.style.borderColor = '#555';
            } else {
                i.value = ''; // Limpa campos de senha
            }
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