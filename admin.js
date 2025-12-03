document.addEventListener('DOMContentLoaded', async() => {
    // 1. Verifica se o Supabase está disponível
    const sbClient = window.supabase;
    if (!sbClient) {
        console.error('Erro CRÍTICO: Cliente Supabase não encontrado.');
        alert('Erro de sistema: Conexão falhou.');
        return;
    }

    // 2. Verifica Login
    const { data: { user } } = await sbClient.auth.getUser();

    if (!user) {
        alert('Acesso negado. Faça login.');
        window.location.href = 'index.html';
        return;
    }

    // 3. Verifica Permissão de Admin
    try {
        const { data: perfil, error } = await sbClient
            .from('usu_cadastro')
            .select('admin')
            .eq('EMAIL_USU', user.email)
            .single();

        if (error || !perfil || perfil.admin !== 1) {
            alert('Área restrita apenas para administradores.');
            window.location.href = 'index.html';
            return;
        }
    } catch (err) {
        console.error('Erro ao verificar permissão:', err);
        window.location.href = 'index.html';
        return;
    }

    // --- VARIÁVEIS GLOBAIS ---
    let todosOrcamentos = [];
    const tbody = document.getElementById('orcamentos-tbody');
    const filterSelect = document.getElementById('filterStatus');

    // --- FUNÇÃO PARA BUSCAR DADOS ---
    async function fetchOrcamentos() {
        try {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-text" style="text-align:center; padding:20px;">Carregando pedidos...</td></tr>';

            // 1. Busca os orçamentos
            const { data: orcamentos, error: orcError } = await sbClient
                .from('tb_orcamento')
                .select('*')
                .order('COD_ORCAMENTO', { ascending: false });

            if (orcError) throw orcError;

            // 2. Busca dados complementares dos usuários (Manual Join)
            // Isso evita erros se a Foreign Key não estiver configurada no banco
            const orcamentosCompletos = await Promise.all(orcamentos.map(async(orc) => {
                let dadosUsuario = { END_USU: 'Não encontrado', TEL_USU: '' };

                if (orc.fk_cod_usuario) {
                    const { data: userDetails } = await sbClient
                        .from('usu_cadastro')
                        .select('END_USU, TEL_USU')
                        .eq('COD_USUARIO', orc.fk_cod_usuario)
                        .single();

                    if (userDetails) {
                        dadosUsuario = userDetails;
                    }
                }

                // Anexa os dados do usuário ao objeto do orçamento
                return {...orc, usu_cadastro: dadosUsuario };
            }));

            todosOrcamentos = orcamentosCompletos;
            renderTable(todosOrcamentos);

        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Erro ao carregar dados. Verifique o console.</td></tr>';
        }
    }

    // --- FUNÇÃO DE RENDERIZAÇÃO DA TABELA ---
    function renderTable(lista) {
        tbody.innerHTML = '';

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #888;">Nenhum pedido encontrado.</td></tr>';
            return;
        }

        lista.forEach(orc => {
            const tr = document.createElement('tr');

            // Formatação de Data e Hora
            const dataRaw = orc.DATA_SOLICITACAO || orc.created_at || new Date().toISOString();
            const dateObj = new Date(dataRaw);
            const dataStr = dateObj.toLocaleDateString('pt-BR');
            const horaStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Dados do Cliente
            const clienteNome = orc.NOME_CONTATO || 'Desconhecido';
            const clienteEmpresa = orc.NOME_EMPRESA ? `(${orc.NOME_EMPRESA})` : '';
            const clienteEmail = orc.EMAIL_CONTATO || 'Sem e-mail';

            // CORREÇÃO AQUI: Sintaxe ?. (junto)
            const clienteEndereco = orc.usu_cadastro ? .END_USU || 'Endereço não disponível';
            const clienteTelBanco = orc.usu_cadastro ? .TEL_USU;

            const clienteTelOrcamento = orc.TELEFONE_CONTATO;

            // Prioriza telefone do pedido
            let telefoneFinal = clienteTelOrcamento || clienteTelBanco || '';
            if (telefoneFinal) telefoneFinal = formatarTelefone(telefoneFinal.toString());
            else telefoneFinal = 'Sem telefone';

            const descCompleta = orc.DESCRICAO || 'Sem descrição.';
            const statusAtual = orc.STATUS_ORCAMENTO || 'Não Visualizado';

            // Links
            const emailLink = `<a href="mailto:${clienteEmail}" title="Enviar e-mail" style="color: #f0c029; text-decoration: none;">${clienteEmail}</a>`;
            const whatsLink = telefoneFinal !== 'Sem telefone' ? `<a href="https://wa.me/55${telefoneFinal.replace(/\D/g,'')}" target="_blank" style="color: #2ecc71; text-decoration: none; margin-left: 5px;" title="Chamar no WhatsApp"><i class="fab fa-whatsapp"></i></a>` : '';

            tr.innerHTML = `
                <td><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td>
                    <div>${dataStr}</div>
                    <div style="font-size: 0.85em; color: #888;">${horaStr}</div>
                </td>
                <td class="client-info">
                    <div style="font-weight:bold; color:#fff;">${clienteNome} ${clienteEmpresa}</div>
                    <div class="client-email">${emailLink}</div>
                    <div style="font-size: 0.85em; color: #ccc;">${telefoneFinal} ${whatsLink}</div>
                </td>
                <td style="max-width: 200px; font-size: 0.9em; color: #ccc;">${clienteEndereco}</td>
                <td>${orc.TIPO_SERVICO}</td>
                
                <td style="text-align: center;">
                    <button class="btn-ver-desc" style="padding: 5px 10px; background: transparent; border: 1px solid #f0c029; color: #f0c029; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                        <i class="far fa-eye"></i> Ler
                    </button>
                </td>

                <td>
                    <select class="status-select" data-id="${orc.COD_ORCAMENTO}" style="padding: 5px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;">
                        <option value="Não Visualizado" ${statusAtual === 'Não Visualizado' ? 'selected' : ''}>Não Visualizado</option>
                        <option value="Pendente" ${statusAtual === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Concluido" ${statusAtual === 'Concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </td>
            `;

            tr.querySelector('.btn-ver-desc').addEventListener('click', () => {
                if (typeof showCustomModal === 'function') {
                    showCustomModal(descCompleta, `Detalhes do Pedido #${orc.COD_ORCAMENTO}`);
                } else {
                    alert(descCompleta);
                }
            });

            tbody.appendChild(tr);
        });

        // Eventos de mudança de status
        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async(e) => {
                const id = e.target.dataset.id;
                const novoStatus = e.target.value;
                const originalValue = e.target.getAttribute('data-original');

                e.target.disabled = true;
                e.target.style.opacity = '0.5';

                try {
                    const { error } = await sbClient
                        .from('tb_orcamento')
                        .update({ STATUS_ORCAMENTO: novoStatus })
                        .eq('COD_ORCAMENTO', id);

                    if (error) throw error;

                    const index = todosOrcamentos.findIndex(o => o.COD_ORCAMENTO == id);
                    if (index !== -1) todosOrcamentos[index].STATUS_ORCAMENTO = novoStatus;

                    e.target.disabled = false;
                    e.target.style.opacity = '1';

                } catch (err) {
                    console.error(err);
                    alert('Erro ao atualizar status: ' + err.message);
                    e.target.value = originalValue || novoStatus;
                    e.target.disabled = false;
                    e.target.style.opacity = '1';
                }
            });

            sel.addEventListener('focus', (e) => {
                e.target.setAttribute('data-original', e.target.value);
            });
        });
    }

    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            const status = e.target.value;
            if (status === 'Todos') {
                renderTable(todosOrcamentos);
            } else {
                const filtrados = todosOrcamentos.filter(o => o.STATUS_ORCAMENTO === status);
                renderTable(filtrados);
            }
        });
    }

    fetchOrcamentos();
});

function formatarTelefone(v) {
    v = v.replace(/\D/g, "");
    if (v.length > 10) return v.replace(/^(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2$3-$4");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return v;
}