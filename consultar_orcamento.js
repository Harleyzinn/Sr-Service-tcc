document.addEventListener('DOMContentLoaded', async() => {
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
    const tableAtivos = document.getElementById('tabela-ativos');
    const tableConcluidos = document.getElementById('tabela-concluidos');

    const filterSelect = document.getElementById('filtroStatus');

    let todosOrcamentos = [];

    try {
        const { data: perfil, error: perfilError } = await sbClient
            .from('usu_cadastro')
            .select('COD_USUARIO')
            .eq('EMAIL_USU', user.email)
            .single();

        if (perfilError || !perfil) {
            console.error(perfilError);
            return;
        }

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
        if (tbodyAtivos) tbodyAtivos.innerHTML = '<tr><td colspan="5" class="text-center" style="color:red;">Erro ao carregar.</td></tr>';
    }

    function distribuirOrcamentos(listaCompleta) {
        tbodyAtivos.innerHTML = '';
        tbodyConcluidos.innerHTML = '';

        const statusAtivos = ['Não Visualizado', 'Pendente', 'Em Análise', 'Aprovado'];

        const listaAtivos = listaCompleta.filter(o => statusAtivos.includes(o.STATUS_ORCAMENTO));
        const listaConcluidos = listaCompleta.filter(o => !statusAtivos.includes(o.STATUS_ORCAMENTO));

        renderRows(tbodyAtivos, listaAtivos);
        renderRows(tbodyConcluidos, listaConcluidos);

        // Lógica de Exibição
        const temAtivos = listaAtivos.length > 0;
        const temConcluidos = listaConcluidos.length > 0;

        // Ativos
        if (temAtivos) {
            tableAtivos.style.display = 'table';
            msgSemAtivos.style.display = 'none';
        } else {
            tableAtivos.style.display = 'none';
            msgSemAtivos.style.display = 'block';
        }

        // Concluidos
        if (temConcluidos) {
            tableConcluidos.style.display = 'table';
            msgSemConcluidos.style.display = 'none';
        } else {
            tableConcluidos.style.display = 'none';
            msgSemConcluidos.style.display = 'block';
        }

        // Geral
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

    function renderRows(tbody, lista) {
        lista.forEach(orc => {
            const tr = document.createElement('tr');

            // --- DATA E HORA ---
            const dataObj = new Date(orc.created_at || orc.DATA_SOLICITACAO);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const statusRaw = orc.STATUS_ORCAMENTO || 'Não Visualizado';
            let statusClass = 'status-nao-visualizado';

            if (statusRaw === 'Aprovado' || statusRaw === 'Concluido') statusClass = 'status-aprovado';
            else if (statusRaw === 'Pendente') statusClass = 'status-pendente';
            else if (statusRaw === 'Recusado') statusClass = 'status-recusado';
            else if (statusRaw === 'Em Análise') statusClass = 'status-em-analise';

            const descCompleta = orc.DESCRICAO;

            // OBSERVE: Sem style inline para padding/border, apenas classes para alinhamento
            tr.innerHTML = `
                <td><strong>#${orc.COD_ORCAMENTO}</strong></td>
                <td>
                    <div>${dataFormatada}</div>
                    <div style="font-size: 0.85em; color: #888; margin-top: 2px;"><i class="far fa-clock"></i> ${horaFormatada}</div>
                </td>
                <td>${orc.TIPO_SERVICO}</td>
                <td class="text-center">
                    <button class="btn-ver-desc">
                        <i class="far fa-eye"></i> Ler
                    </button>
                </td>
                <td class="text-center">
                    <span class="status-badge ${statusClass}">${statusRaw}</span>
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