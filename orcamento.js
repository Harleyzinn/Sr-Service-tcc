document.addEventListener('DOMContentLoaded', async() => {
    // VERIFICAÇÃO DE LOGIN AO ENTRAR NA PÁGINA
    const sbClient = window.supabase;
    if (!sbClient) {
        console.error('Erro: Supabase client não encontrado.');
        return;
    }

    const { data: { user } } = await sbClient.auth.getUser();

    // Se não estiver logado, avisa e redireciona
    if (!user) {
        setTimeout(async() => {
            if (typeof showCustomModal === 'function') {
                await showCustomModal('Você precisa estar logado para solicitar orçamentos. Clique em OK para ir à página de login.', 'Acesso Restrito');
            } else {
                alert('Acesso Restrito. Faça login.');
            }
            window.location.href = 'index.html';
        }, 500);
        return;
    }

    // --- BLOQUEIO DE ADMIN ---
    const { data: perfil, error: perfilError } = await sbClient
        .from('usu_cadastro')
        .select('COD_USUARIO, admin')
        .eq('EMAIL_USU', user.email)
        .single();

    if (perfil && perfil.admin === 1) {
        if (typeof showCustomModal === 'function') {
            await showCustomModal('Administradores não podem enviar orçamentos. Clique em OK para acessar o Painel Administrativo.', 'Acesso de Admin');
        }
        window.location.href = 'admin.html';
        return;
    }

    // --- FUNÇÕES DE MÁSCARA E FORMATAÇÃO ---

    // 1. Formata Telefone (XX) 9XXXX-XXXX
    function formatarTelefone(v) {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);

        if (v.length > 10) return v.replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2$3-$4");
        if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        return v;
    }

    // 2. Formata CEP 00000-000
    function formatarCEP(v) {
        v = v.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        if (v.length > 5) return v.replace(/^(\d{5})(\d)/, "$1-$2");
        return v;
    }

    // --- APLICAÇÃO DE EVENTOS NOS INPUTS ---

    const telInput = document.getElementById('telefone');
    if (telInput) {
        telInput.addEventListener('input', (e) => {
            e.target.value = formatarTelefone(e.target.value);
        });
    }

    const nomeInput = document.getElementById('nome_contato');
    if (nomeInput) {
        // Impede digitação de números e símbolos em tempo real
        nomeInput.addEventListener('input', (e) => {
            // Substitui tudo que NÃO for letra ou espaço por vazio
            e.target.value = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
        });
    }

    // --- LÓGICA DE AUTO-COMPLETE DE CEP (ViaCEP) ---
    const cepInput = document.getElementById('cep_obra');
    const enderecoInput = document.getElementById('endereco_obra');

    if (cepInput && enderecoInput) {
        // Máscara
        cepInput.addEventListener('input', (e) => {
            e.target.value = formatarCEP(e.target.value);
        });

        // Busca ao sair do campo (blur)
        cepInput.addEventListener('blur', async(e) => {
            const cep = e.target.value.replace(/\D/g, '');

            if (cep.length === 8) {
                enderecoInput.placeholder = "Buscando endereço...";
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();

                    if (!data.erro) {
                        // Preenche o endereço automaticamente
                        // Formato: Rua, Bairro, Cidade - UF
                        enderecoInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                        // Foca no endereço para a pessoa completar o número
                        enderecoInput.focus();
                        if (typeof showCustomModal === 'function') {
                            // Opcional: Aviso discreto ou apenas focar
                            // showCustomModal('Endereço encontrado! Por favor, complete com o número.', 'CEP Localizado');
                        }
                    } else {
                        showCustomModal('CEP não encontrado. Por favor, digite o endereço manualmente.', 'Aviso');
                        enderecoInput.value = "";
                        enderecoInput.placeholder = "Digite o endereço...";
                    }
                } catch (error) {
                    console.error('Erro ViaCEP:', error);
                    enderecoInput.placeholder = "Erro ao buscar. Digite manualmente.";
                }
            }
        });
    }

    // --- ENVIO DO FORMULÁRIO ---
    const formOrcamento = document.getElementById('form-orcamento');
    if (!formOrcamento) return;

    formOrcamento.addEventListener('submit', async(event) => {
        event.preventDefault();

        const btnSubmit = formOrcamento.querySelector('button[type="submit"]');
        const btnOriginalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const form = event.target;
            const nome = form.nome_contato.value.trim();
            const email = form.email_orc.value.trim();
            const telefoneRaw = form.telefone.value;
            const telefoneLimpo = telefoneRaw.replace(/\D/g, '');
            const enderecoObra = form.endereco_obra.value.trim(); // Pega o endereço preenchido

            // --- VALIDAÇÕES ---

            // 1. Nome (Verifica se está vazio ou inválido - redundância segura)
            if (nome.length < 3) {
                throw new Error('Por favor, digite um nome válido.');
            }

            // 2. Validação de E-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Por favor, insira um endereço de e-mail válido.');
            }

            // 3. Validação de Telefone (Tamanho)
            if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
                throw new Error('O telefone deve ter 10 ou 11 dígitos (DDD + Número).');
            }

            // Re-valida sessão antes de enviar (segurança)
            const { data: { user: currentUser } } = await sbClient.auth.getUser();
            if (!currentUser) throw new Error('Sessão expirou.');

            // Prepara endereço final (se tiver CEP, junta)
            let enderecoFinal = enderecoObra;
            const cepValue = form.cep_obra ? form.cep_obra.value : '';
            if (cepValue && enderecoFinal) {
                enderecoFinal = `(CEP: ${cepValue}) ${enderecoFinal}`;
            }

            // Precisamos garantir que este endereço seja salvo
            // Como não sei se a coluna 'ENDERECO_OBRA' existe, vou concatenar na descrição se necessário
            // ou tentar salvar em uma coluna específica se você criou.
            // Vou assumir a estratégia segura: Concatenar na descrição para garantir que o Admin veja.
            // SE você criar a coluna 'ENDERECO_OBRA' na tabela tb_orcamento, descomente a linha abaixo.

            // Opção A: Concatenar na descrição (Funciona sempre)
            let descricaoCompleta = form.descricao.value;
            if (enderecoFinal) {
                descricaoCompleta += `\n\n[Endereço da Obra]: ${enderecoFinal}`;
            }

            const orcamentoData = {
                NOME_EMPRESA: form.nome_empresa.value,
                NOME_CONTATO: nome,
                EMAIL_CONTATO: email,
                TELEFONE_CONTATO: telefoneRaw, // Envia formatado
                TIPO_SERVICO: form.tipo_servico.value,
                DESCRICAO: descricaoCompleta,
                STATUS_ORCAMENTO: 'Não Visualizado',
                fk_cod_usuario: perfil.COD_USUARIO
                    // ENDERECO_OBRA: enderecoFinal // Descomente se tiver criado a coluna no banco
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
            if (typeof showCustomModal === 'function') {
                showCustomModal(error.message, 'Atenção');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = btnOriginalText;
        }
    });
});