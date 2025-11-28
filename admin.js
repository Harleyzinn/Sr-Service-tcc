document.addEventListener('DOMContentLoaded', async() => {
    // Verificações iniciais
    if (typeof supabase === 'undefined') { console.error('Erro: Supabase não encontrado.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Acesso negado.');
        window.location.href = 'index.html'; return; }

    const { data: perfil } = await supabase.from('usu_cadastro').select('admin').eq('EMAIL_USU', user.email).single();
    if (!perfil || perfil.admin !== 1) { alert('Acesso restrito a administradores.');
        window.location.href = 'index.html'; return; }

    // Carrega dados
    let todosOrcamentos = [];

    // Elementos do DOM
    const tbody = document.getElementById('orcamentos-tbody');
    const filterSelect = document.getElementById('filterStatus');

    // Função para buscar dados
    async function fetchOrcamentos() {
        const { data, error } = await supabase
            .from('tb_orcamento')
            .select('*')
            .order('COD_ORCAMENTO', { ascending: false });

        if (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="6">Erro ao carregar dados.</td></tr>';
            return;
        }

        todosOrcamentos = data;
        renderTable(todosOrcamentos);
    }

    // Função para renderizar a tabela
    function renderTable(lista) {
        tbody.innerHTML = '';

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum pedido encontrado.</td></tr>';
            return;
        }

        lista.forEach(orc => {
            const tr = document.createElement('tr');

            // Data e Hora
            const dataRaw = orc.DATA_SOLICITACAO || orc.created_at || new Date().toISOString();
            const dateObj = new Date(dataRaw);
            const dataStr = dateObj.toLocaleDateString('pt-BR');
            const horaStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Descrição Completa (para o modal)
            const desc = orc.DESCRICAO || 'Nenhuma descrição informada.';

            tr.innerHTML = `
                <td><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td>
                    <div>${dataStr}</div>
                    <div class="time-info"><i class="far fa-clock"></i> ${horaStr}</div>
                </td>
                <td class="client-info">
                    <div style="font-weight:bold; color:#fff;">${orc.NOME_EMPRESA || 'Particular'}</div>
                    <div>${orc.NOME_CONTATO}</div>
                    <div class="client-email">${orc.EMAIL_CONTATO}</div>
                </td>
                <td>${orc.TIPO_SERVICO}</td>
                
                <!-- Botão de Descrição (Pop-up) -->
                <td style="text-align: center;">
                    <button class="btn-ver-desc" style="padding: 6px 12px; background: #333; color: #f0c029; border: 1px solid #f0c029; border-radius: 4px; cursor: pointer; transition: 0.3s;">
                        <i class="far fa-eye"></i> Ler
                    </button>
                </td>

                <td>
                    <select class="status-select" data-id="${orc.COD_ORCAMENTO}">
                        <option value="Não Visualizado" ${orc.STATUS_ORCAMENTO === 'Não Visualizado' ? 'selected' : ''}>Não Visualizado</option>
                        <option value="Pendente" ${orc.STATUS_ORCAMENTO === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Concluido" ${orc.STATUS_ORCAMENTO === 'Concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </td>
            `;

            // Adiciona evento de clique no botão de descrição
            const btnDesc = tr.querySelector('.btn-ver-desc');
            btnDesc.addEventListener('mouseover', () => { btnDesc.style.background = '#f0c029';
                btnDesc.style.color = '#1a1a1a'; });
            btnDesc.addEventListener('mouseout', () => { btnDesc.style.background = '#333';
                btnDesc.style.color = '#f0c029'; });

            btnDesc.addEventListener('click', () => {
                if (typeof showCustomModal === 'function') {
                    // Usa nosso modal customizado global
                    showCustomModal(desc, `Detalhes do Pedido #${orc.COD_ORCAMENTO}`);
                } else {
                    alert(desc);
                }
            });

            tbody.appendChild(tr);
        });

        // Reatribuir eventos aos selects
        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async(e) => {
                const id = e.target.dataset.id;
                const novoStatus = e.target.value;

                // Atualiza no banco
                const { error } = await supabase
                    .from('tb_orcamento')
                    .update({ STATUS_ORCAMENTO: novoStatus })
                    .eq('COD_ORCAMENTO', id);

                if (error) alert('Erro ao atualizar: ' + error.message);
                else {
                    // Atualiza array local para o filtro funcionar sem recarregar
                    const index = todosOrcamentos.findIndex(o => o.COD_ORCAMENTO == id);
                    if (index !== -1) todosOrcamentos[index].STATUS_ORCAMENTO = novoStatus;
                }
            });
        });
    }

    // Evento de Filtro
    filterSelect.addEventListener('change', (e) => {
        const status = e.target.value;
        if (status === 'Todos') {
            renderTable(todosOrcamentos);
        } else {
            const filtrados = todosOrcamentos.filter(o => o.STATUS_ORCAMENTO === status);
            renderTable(filtrados);
        }
    });

    // Inicializa
    fetchOrcamentos();
});