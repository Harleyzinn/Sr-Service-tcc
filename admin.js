document.addEventListener('DOMContentLoaded', async() => {
    if (typeof supabase === 'undefined') { console.error('Erro: Supabase não encontrado.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Acesso negado.');
        window.location.href = 'index.html';
        return;
    }

    const { data: perfil } = await supabase.from('usu_cadastro').select('admin').eq('EMAIL_USU', user.email).single();
    if (!perfil || perfil.admin !== 1) {
        alert('Acesso restrito a administradores.');
        window.location.href = 'index.html';
        return;
    }

    let todosOrcamentos = [];
    const tbody = document.getElementById('orcamentos-tbody');
    const filterSelect = document.getElementById('filterStatus');

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

    function renderTable(lista) {
        tbody.innerHTML = '';

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum pedido encontrado.</td></tr>';
            return;
        }

        lista.forEach(orc => {
            const tr = document.createElement('tr');

            const dataRaw = orc.DATA_SOLICITACAO || orc.created_at || new Date().toISOString();
            const dateObj = new Date(dataRaw);
            const dataStr = dateObj.toLocaleDateString('pt-BR');
            const horaStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const desc = orc.DESCRICAO || 'Nenhuma descrição informada.';

            // Email com link clicável
            const emailLink = `<a href="mailto:${orc.EMAIL_CONTATO}" title="Enviar e-mail para ${orc.EMAIL_CONTATO}" style="color: #f0c029; text-decoration: none; border-bottom: 1px dotted #f0c029;">${orc.EMAIL_CONTATO} <i class="fas fa-external-link-alt" style="font-size:0.8em"></i></a>`;

            // Select de Status restrito às opções solicitadas
            tr.innerHTML = `
                <td><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td>
                    <div>${dataStr}</div>
                    <div class="time-info"><i class="far fa-clock"></i> ${horaStr}</div>
                </td>
                <td class="client-info">
                    <div style="font-weight:bold; color:#fff;">${orc.NOME_EMPRESA || 'Particular'}</div>
                    <div>${orc.NOME_CONTATO}</div>
                    <div class="client-email">${emailLink}</div>
                </td>
                <td>${orc.TIPO_SERVICO}</td>
                
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

            const btnDesc = tr.querySelector('.btn-ver-desc');
            btnDesc.addEventListener('mouseover', () => {
                btnDesc.style.background = '#f0c029';
                btnDesc.style.color = '#1a1a1a';
            });
            btnDesc.addEventListener('mouseout', () => {
                btnDesc.style.background = '#333';
                btnDesc.style.color = '#f0c029';
            });

            btnDesc.addEventListener('click', () => {
                if (typeof showCustomModal === 'function') {
                    showCustomModal(desc, `Detalhes do Pedido #${orc.COD_ORCAMENTO}`);
                } else {
                    alert(desc);
                }
            });

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async(e) => {
                const id = e.target.dataset.id;
                const novoStatus = e.target.value;

                const { error } = await supabase
                    .from('tb_orcamento')
                    .update({ STATUS_ORCAMENTO: novoStatus })
                    .eq('COD_ORCAMENTO', id);

                if (error) alert('Erro ao atualizar: ' + error.message);
                else {
                    const index = todosOrcamentos.findIndex(o => o.COD_ORCAMENTO == id);
                    if (index !== -1) todosOrcamentos[index].STATUS_ORCAMENTO = novoStatus;
                }
            });
        });
    }

    filterSelect.addEventListener('change', (e) => {
        const status = e.target.value;
        if (status === 'Todos') {
            renderTable(todosOrcamentos);
        } else {
            const filtrados = todosOrcamentos.filter(o => o.STATUS_ORCAMENTO === status);
            renderTable(filtrados);
        }
    });

    fetchOrcamentos();
});