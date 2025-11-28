document.addEventListener('DOMContentLoaded', async() => {
    // 1. Verifica login
    if (typeof supabase === 'undefined') { console.error('Erro: Supabase não encontrado.'); return; }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Você precisa estar logado.', 'Acesso Negado');
        else alert('Você precisa estar logado.');
        window.location.href = 'index.html';
        return;
    }

    const tbodyAtivos = document.getElementById('lista-orcamentos-ativos');
    const tbodyConcluidos = document.getElementById('lista-orcamentos-concluidos');
    const noData = document.getElementById('no-data-message');
    const tableContainerAtivos = document.getElementById('tabela-ativos').parentElement;
    const tableContainerConcluidos = document.getElementById('tabela-concluidos').parentElement;
    const filterSelect = document.getElementById('filtroStatus');

    let orcamentosAtivos = []; // Armazena para filtrar localmente

    try {
        // 2. Busca ID do usuário
        const { data: perfil, error: perfilError } = await supabase
            .from('usu_cadastro')
            .select('COD_USUARIO')
            .eq('EMAIL_USU', user.email)
            .single();

        if (perfilError || !perfil) {
            tbodyAtivos.innerHTML = '<tr><td colspan="5" style="text-align:center">Erro ao carregar perfil.</td></tr>';
            return;
        }

        // 3. Busca orçamentos
        const { data: orcamentos, error: orcError } = await supabase
            .from('tb_orcamento')
            .select('*')
            .eq('fk_cod_usuario', perfil.COD_USUARIO)
            .order('COD_ORCAMENTO', { ascending: false });

        if (orcError) throw orcError;

        // Limpa loadings
        tbodyAtivos.innerHTML = '';
        tbodyConcluidos.innerHTML = '';

        if (!orcamentos || orcamentos.length === 0) {
            // Esconde tabelas e mostra mensagem de vazio
            tableContainerAtivos.style.display = 'none';
            tableContainerConcluidos.style.display = 'none';
            document.querySelector('.section-divider').style.display = 'none';
            document.querySelector('.secondary-header').style.display = 'none';
            document.querySelector('.filter-wrapper').style.display = 'none';
            noData.style.display = 'block';
            return;
        }

        // 4. Separa os pedidos
        orcamentosAtivos = orcamentos.filter(o =>
            !['Concluido', 'Recusado', 'Cancelado'].includes(o.STATUS_ORCAMENTO)
        );
        const orcamentosConcluidos = orcamentos.filter(o => ['Concluido', 'Recusado', 'Cancelado'].includes(o.STATUS_ORCAMENTO));

        // 5. Renderiza Tabelas
        renderTable(tbodyAtivos, orcamentosAtivos);
        renderTable(tbodyConcluidos, orcamentosConcluidos);

        // Se não houver itens em alguma categoria, mostra mensagem na tabela específica
        if (orcamentosAtivos.length === 0) {
            tbodyAtivos.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #777;">Nenhum pedido em andamento.</td></tr>';
        }
        if (orcamentosConcluidos.length === 0) {
            tbodyConcluidos.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #777;">Nenhum histórico disponível.</td></tr>';
        }

    } catch (err) {
        console.error('Erro:', err);
        tbodyAtivos.innerHTML = '<tr><td colspan="5">Erro ao buscar dados.</td></tr>';
    }

    // --- FUNÇÃO DE RENDERIZAÇÃO ---
    function renderTable(tbodyElement, lista) {
        tbodyElement.innerHTML = ''; // Limpa antes de renderizar

        lista.forEach(orc => {
            // Data e Hora
            const dataRaw = orc.DATA_SOLICITACAO || orc.created_at || new Date().toISOString();
            const dateObj = new Date(dataRaw);
            const dataStr = dateObj.toLocaleDateString('pt-BR');
            const horaStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Descrição (Botão)
            const descCompleta = orc.DESCRICAO || 'Sem descrição.';

            // Status Class
            let statusRaw = orc.STATUS_ORCAMENTO || 'Pendente';
            let statusClass = 'status-pendente';
            const s = statusRaw.toLowerCase();

            if (s.includes('concluido') || s.includes('aprovado')) statusClass = 'status-concluido';
            else if (s.includes('recusado') || s.includes('cancelado')) statusClass = 'status-recusado';
            else if (s.includes('analise')) statusClass = 'status-em-analise';
            else if (s.includes('visualizado')) statusClass = 'status-nao-visualizado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td>
                    <div>${dataStr}</div>
                    <div style="font-size:0.85em; color:#999;">${horaStr}</div>
                </td>
                <td>${orc.TIPO_SERVICO}</td>
                <td style="text-align:center;">
                    <button class="btn-ver-desc" style="padding: 5px 10px; background:#f0c029; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.9em;">
                        <i class="far fa-eye"></i> Ler
                    </button>
                </td>
                <td><span class="status-badge ${statusClass}">${statusRaw}</span></td>
            `;

            // Evento do botão de descrição
            tr.querySelector('.btn-ver-desc').addEventListener('click', () => {
                if (typeof showCustomModal === 'function') {
                    showCustomModal(descCompleta, `Pedido #${orc.COD_ORCAMENTO} - ${orc.TIPO_SERVICO}`);
                } else {
                    alert(descCompleta);
                }
            });

            tbodyElement.appendChild(tr);
        });
    }

    // --- LÓGICA DE FILTRO ---
    filterSelect.addEventListener('change', (e) => {
        const filtro = e.target.value;
        if (filtro === 'Todos') {
            renderTable(tbodyAtivos, orcamentosAtivos);
        } else {
            const filtrados = orcamentosAtivos.filter(o => o.STATUS_ORCAMENTO === filtro);
            renderTable(tbodyAtivos, filtrados);
            if (filtrados.length === 0) {
                tbodyAtivos.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum pedido com este status.</td></tr>';
            }
        }
    });
});