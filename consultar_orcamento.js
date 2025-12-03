document.addEventListener('DOMContentLoaded', async() => {
    // 1. Verifica login
    const sbClient = window.supabase;
    if (!sbClient) { console.error('Erro: Supabase não encontrado.'); return; }

    const { data: { user } } = await sbClient.auth.getUser();

    if (!user) {
        if (typeof showCustomModal === 'function') await showCustomModal('Você precisa estar logado.', 'Acesso Negado');
        else alert('Você precisa estar logado.');
        window.location.href = 'index.html';
        return;
    }

    const tbodyAtivos = document.getElementById('lista-orcamentos-ativos');
    const tbodyConcluidos = document.getElementById('lista-orcamentos-concluidos');

    const msgSemAtivos = document.getElementById('msg-sem-ativos');
    const msgSemConcluidos = document.getElementById('msg-sem-concluidos');
    const noDataGeral = document.getElementById('no-data-message');

    const containerAtivos = document.getElementById('container-ativos');
    const containerConcluidos = document.getElementById('container-concluidos');

    const filterSelect = document.getElementById('filtroStatus');

    let todosOrcamentos = [];

    try {
        // 2. Busca ID do usuário
        const { data: perfil, error: perfilError } = await sbClient
            .from('usu_cadastro')
            .select('COD_USUARIO')
            .eq('EMAIL_USU', user.email)
            .single();

        if (perfilError || !perfil) {
            console.error(perfilError);
            return;
        }

        // 3. Busca orçamentos
        const { data: orcamentos, error: orcError } = await sbClient
            .from('tb_orcamento')
            .select('*')
            .eq('fk_cod_usuario', perfil.COD_USUARIO)
            .order('COD_ORCAMENTO', { ascending: false });

        if (orcError) throw orcError;

        todosOrcamentos = orcamentos;
        distribuirOrcamentos(todosOrcamentos);

    } catch (error) {
        console.error(error);
        if (tbodyAtivos) tbodyAtivos.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar.</td></tr>';
    }

    // --- FUNÇÃO PRINCIPAL ---
    function distribuirOrcamentos(listaCompleta) {
        // Limpa tabelas
        tbodyAtivos.innerHTML = '';
        tbodyConcluidos.innerHTML = '';

        // Status considerados "Ativos"
        const statusAtivos = ['Não Visualizado', 'Pendente', 'Em Análise', 'Aprovado'];

        // Separa os dados
        const listaAtivos = listaCompleta.filter(o => statusAtivos.includes(o.STATUS_ORCAMENTO));
        const listaConcluidos = listaCompleta.filter(o => !statusAtivos.includes(o.STATUS_ORCAMENTO)); // Concluido, Recusado, Cancelado

        // Renderiza cada parte
        renderRows(tbodyAtivos, listaAtivos);
        renderRows(tbodyConcluidos, listaConcluidos);

        // Controla visibilidade das mensagens de "Vazio"
        const temAtivos = listaAtivos.length > 0;
        const temConcluidos = listaConcluidos.length > 0;

        // Tabela Ativos
        if (temAtivos) {
            tbodyAtivos.parentElement.parentElement.style.display = 'block'; // Mostra div .table-responsive
            msgSemAtivos.style.display = 'none';
        } else {
            tbodyAtivos.parentElement.parentElement.style.display = 'none';
            msgSemAtivos.style.display = 'block';
        }

        // Tabela Concluidos
        if (temConcluidos) {
            tbodyConcluidos.parentElement.parentElement.style.display = 'block';
            msgSemConcluidos.style.display = 'none';
        } else {
            tbodyConcluidos.parentElement.parentElement.style.display = 'none';
            msgSemConcluidos.style.display = 'block';
        }

        // Se não tem nada em lugar nenhum
        if (!temAtivos && !temConcluidos) {
            containerAtivos.style.display = 'none';
            containerConcluidos.style.display = 'none';
            noDataGeral.style.display = 'block';
        } else {
            containerAtivos.style.display = 'block';
            containerConcluidos.style.display = 'block';
            noDataGeral.style.display = 'none';
        }
    }

    // --- RENDERIZA LINHAS ---
    function renderRows(tbody, lista) {
        lista.forEach(orc => {
            const tr = document.createElement('tr');

            const dataObj = new Date(orc.created_at || orc.DATA_SOLICITACAO);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Define classe de cor baseada no status
            const statusRaw = orc.STATUS_ORCAMENTO || 'Não Visualizado';
            let statusClass = 'status-nao-visualizado';

            if (statusRaw === 'Aprovado' || statusRaw === 'Concluido') statusClass = 'status-aprovado';
            else if (statusRaw === 'Pendente') statusClass = 'status-pendente';
            else if (statusRaw === 'Recusado') statusClass = 'status-recusado';
            else if (statusRaw === 'Em Análise') statusClass = 'status-em-analise';

            const descCompleta = orc.DESCRICAO;

            tr.innerHTML = `
                <td style="padding: 15px; border-bottom: 1px solid #eee;"><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td style="padding: 15px; border-bottom: 1px solid #eee;">
                    <div>${dataFormatada}</div>
                    <div style="font-size: 0.85em; color: #888; margin-top: 2px;"><i class="far fa-clock"></i> ${horaFormatada}</div>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #eee;">${orc.TIPO_SERVICO}</td>
                <td style="padding: 15px; border-bottom: 1px solid #eee; text-align:center;">
                    <button class="btn-ver-desc" style="padding: 6px 12px; background:transparent; border:1px solid #f0c029; color:#1a1a1a; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.9em;">
                        <i class="far fa-eye"></i> Ler
                    </button>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #eee; text-align:center;">
                    <span class="status-badge ${statusClass}" style="padding: 5px 10px; border-radius: 15px; color: #fff; font-size: 0.85em; font-weight: bold;">
                        ${statusRaw}
                    </span>
                </td>
            `;

            tr.querySelector('.btn-ver-desc').addEventListener('click', () => {
                if (typeof showCustomModal === 'function') {
                    showCustomModal(descCompleta, `Pedido #${orc.COD_ORCAMENTO} - ${orc.TIPO_SERVICO}`);
                } else {
                    alert(descCompleta);
                }
            });

            tbody.appendChild(tr);
        });
    }

    // --- LÓGICA DE FILTRO ---
    filterSelect.addEventListener('change', (e) => {
        const filtro = e.target.value;
        if (filtro === 'Todos') {
            distribuirOrcamentos(todosOrcamentos);
        } else {
            const filtrados = todosOrcamentos.filter(o => o.STATUS_ORCAMENTO === filtro);
            distribuirOrcamentos(filtrados);
        }
    });
});