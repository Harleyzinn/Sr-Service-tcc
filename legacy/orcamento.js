document.addEventListener('DOMContentLoaded', async() => {
    const sbClient = window.supabase;
    if (!sbClient) {
        console.error('Erro: Supabase client não encontrado.');
        return;
    }

    const { data: { user } } = await sbClient.auth.getUser();

    // Redireciona se não estiver logado
    if (!user) {
        setTimeout(async() => {
            if (typeof showCustomModal === 'function') {
                await showCustomModal('Você precisa estar logado para solicitar orçamentos.', 'Acesso Restrito');
            } else {
                alert('Acesso Restrito. Faça login.');
            }
            window.location.href = 'index.html';
        }, 500);
        return;
    }

    let perfilUsuario = null;
    try {
        const { data: perfil, error } = await sbClient
            .from('usu_cadastro')
            .select('*')
            .eq('EMAIL_USU', user.email)
            .single();

        if (perfil) {
            perfilUsuario = perfil;

            const nomeInput = document.getElementById('nome_contato');
            const emailInput = document.getElementById('email_orc');
            const cpfInput = document.getElementById('cpf_orc');
            const telInput = document.getElementById('telefone');

            if (nomeInput) nomeInput.value = perfil.NOME_USU || '';
            if (emailInput) emailInput.value = perfil.EMAIL_USU || user.email;
            if (cpfInput) cpfInput.value = perfil.CPF_CNPJ_USU || '';
            if (telInput && perfil.TEL_USU) telInput.value = formatarTelefone(perfil.TEL_USU.toString());
        }

        if (perfil && perfil.admin === 1) {
            if (typeof showCustomModal === 'function') {
                await showCustomModal('Administradores não enviam orçamentos.', 'Aviso');
            }
            window.location.href = 'admin.html';
            return;
        }

    } catch (err) {
        console.error("Erro ao carregar perfil:", err);
    }

    // --- MÁSCARAS E RESTRIÇÕES ---
    function formatarTelefone(v) {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 10) return v.replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2$3-$4");
        if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        return v;
    }

    function formatarCEP(v) {
        v = v.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        if (v.length > 5) return v.replace(/^(\d{5})(\d)/, "$1-$2");
        return v;
    }

    const telInput = document.getElementById('telefone');
    if (telInput) telInput.addEventListener('input', (e) => e.target.value = formatarTelefone(e.target.value));

    const nomeInput = document.getElementById('nome_contato');
    if (nomeInput) {
        nomeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
        });
    }

    // --- AUTO-COMPLETE CEP ---
    const cepInput = document.getElementById('cep_obra');
    const numeroInput = document.getElementById('numero_obra');
    const enderecoInput = document.getElementById('endereco_obra');

    if (cepInput && enderecoInput) {
        cepInput.addEventListener('input', (e) => e.target.value = formatarCEP(e.target.value));

        cepInput.addEventListener('blur', async(e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                enderecoInput.value = "Buscando...";
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        enderecoInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                        numeroInput.focus();
                    } else {
                        showCustomModal('CEP não encontrado.', 'Erro');
                        enderecoInput.value = "";
                        enderecoInput.removeAttribute('readonly');
                        enderecoInput.focus();
                    }
                } catch (error) {
                    console.error('Erro ViaCEP:', error);
                    enderecoInput.value = "";
                    enderecoInput.placeholder = "Erro na busca. Digite manualmente.";
                    enderecoInput.removeAttribute('readonly');
                }
            }
        });
    }

    // --- ENVIO ---
    const formOrcamento = document.getElementById('form-orcamento');
    if (formOrcamento) {
        formOrcamento.addEventListener('submit', async(event) => {
            event.preventDefault();

            const btnSubmit = formOrcamento.querySelector('button[type="submit"]');
            const btnOriginalText = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            try {
                const form = event.target;

                const nome = form.nome_contato.value.trim();
                const empresa = form.nome_empresa.value.trim();
                const email = form.email_orc.value.trim();
                const telRaw = form.telefone.value.replace(/\D/g, '');

                const cep = form.cep_obra.value;
                const numero = form.numero_obra.value;
                const enderecoBase = form.endereco_obra.value;
                const enderecoCompleto = `${enderecoBase}, Nº ${numero} (CEP: ${cep})`;

                // Validações
                if (nome.length < 3 || nome.split(' ').length < 2) throw new Error('Nome inválido (insira nome e sobrenome).');
                if (telRaw.length < 10) throw new Error('Telefone inválido (mínimo 10 dígitos).');
                if (!enderecoBase || !numero) throw new Error('Endereço incompleto. Preencha CEP e Número.');

                const { data: { user: currentUser } } = await sbClient.auth.getUser();
                if (!currentUser) throw new Error('Sessão expirou.');

                let descricaoFinal = form.descricao.value;
                descricaoFinal += `\n\n--- LOCAL DA OBRA ---\n${enderecoCompleto}`;

                const orcamentoData = {
                    NOME_EMPRESA: empresa,
                    NOME_CONTATO: nome,
                    EMAIL_CONTATO: email,
                    TELEFONE_CONTATO: form.telefone.value,
                    TIPO_SERVICO: form.tipo_servico.value,
                    DESCRICAO: descricaoFinal,
                    STATUS_ORCAMENTO: 'Não Visualizado',
                    fk_cod_usuario: perfilUsuario.COD_USUARIO
                };

                const { error } = await sbClient.from('tb_orcamento').insert(orcamentoData);

                if (error) throw error;

                if (typeof showCustomModal === 'function') {
                    await showCustomModal('Pedido enviado com sucesso! Acompanhe no seu Perfil.', 'Sucesso');
                } else {
                    alert('Pedido enviado com sucesso!');
                }

                form.reset();
                window.location.href = 'consultar_orcamento.html';

            } catch (error) {
                console.error(error);
                if (typeof showCustomModal === 'function') showCustomModal(error.message, 'Erro');
                else alert(error.message);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = btnOriginalText;
            }
        });
    }
});