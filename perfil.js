document.addEventListener('DOMContentLoaded', async() => {
    const sbClient = window.supabase;

    if (!sbClient || !sbClient.auth) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        alert('Erro de sistema: Conexão com banco de dados falhou.');
        return;
    }

    // --- MÁSCARAS ---

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

    function formatarTelefone(v) {
        if (!v) return "";
        v = v.toString().replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);

        if (v.length > 10) return v.replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2$3-$4");
        if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        return v;
    }

    // Eventos de Input
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = aplicarMascaraCpf(e.target.value);
        });
    }

    const telInput = document.getElementById('tel');
    if (telInput) {
        telInput.addEventListener('input', (e) => {
            e.target.value = formatarTelefone(e.target.value);
        });
    }

    const nomeInput = document.getElementById('nome');
    if (nomeInput) {
        nomeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
        });
    }

    // --- CARREGAMENTO ---
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
        document.getElementById('tel').value = perfil.TEL_USU ? formatarTelefone(perfil.TEL_USU) : '';
        document.getElementById('endereco').value = perfil.END_USU || '';
    } else {
        document.getElementById('email').value = user.email;
    }

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

    // --- SALVAR ---
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
            showCustomModal('Todos os campos são obrigatórios.', 'Dados Incompletos');
            return;
        }

        // 2. Validação de Nome
        if (nome.split(' ').length < 2) {
            showCustomModal('Por favor, digite seu nome completo (Nome e Sobrenome).', 'Nome Incompleto');
            return;
        }

        // 3. Validação de Telefone
        const telLimpo = telRaw.replace(/\D/g, '');
        if (telLimpo.length < 10) {
            showCustomModal('Telefone inválido (mínimo 10 dígitos).', 'Erro de Validação');
            return;
        }

        // 4. Validação de CPF/CNPJ
        const cpfLimpo = cpfRaw.replace(/\D/g, '');
        if (cpfLimpo.length === 11) {
            if (!validarCPF(cpfLimpo)) {
                showCustomModal('CPF inválido.', 'Erro');
                return;
            }
        } else if (cpfLimpo.length === 14) {
            if (!validarCNPJ(cpfLimpo)) {
                showCustomModal('CNPJ inválido.', 'Erro');
                return;
            }
        } else {
            showCustomModal('Documento inválido.', 'Erro');
            return;
        }

        const { error: updateError } = await sbClient
            .from('usu_cadastro')
            .update({
                NOME_USU: nome,
                CPF_CNPJ_USU: cpfRaw,
                TEL_USU: telLimpo,
                END_USU: endereco
            })
            .eq('EMAIL_USU', user.email);

        if (updateError) {
            showCustomModal('Erro ao atualizar: ' + updateError.message, 'Erro');
            return;
        }

        if (novaSenha) {
            if (novaSenha.length < 6) {
                showCustomModal('Senha muito curta.', 'Erro');
                return;
            }
            if (novaSenha !== confirmaSenha) {
                showCustomModal('Senhas não coincidem.', 'Erro');
                return;
            }

            const { error: passError } = await sbClient.auth.updateUser({ password: novaSenha });

            if (passError) {
                showCustomModal('Erro ao alterar senha: ' + passError.message, 'Erro');
            } else {
                await showCustomModal('Senha alterada! Relogue.', 'Sucesso');
                await sbClient.auth.signOut();
                window.location.href = 'index.html';
                return;
            }
        }

        await showCustomModal('Perfil atualizado com sucesso.', 'Sucesso');

        document.querySelectorAll('#form-perfil input[type="text"], #form-perfil input[type="tel"]').forEach(i => {
            i.setAttribute('readonly', true);
            i.style.borderColor = '#555';
        });
    });
});

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