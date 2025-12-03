document.addEventListener('DOMContentLoaded', async() => {
    injectCustomModalHTML();
    injectLoginModalHTML();
    await setupHeader();
    updateFooter();

    const hash = window.location.hash;
    if (hash) {
        if (hash.includes('type=recovery')) {
            if (!window.location.pathname.includes('recuperar_senha.html')) {
                window.location.href = 'recuperar_senha.html' + hash;
            }
        } else if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
            history.replaceState(null, null, window.location.pathname);
            setTimeout(() => {
                showCustomModal('Este link de confirmação já foi utilizado ou expirou. Tente fazer login normalmente.', 'Link Expirado');
            }, 1000);
        }
    }
});

// --- CONFIGURAÇÃO DO CABEÇALHO (AUTH) ---
async function setupHeader() {
    const loginArea = document.querySelector('.login-area');
    if (!loginArea) return;

    const sbClient = window.supabase;
    if (!sbClient || !sbClient.auth) return;

    const { data: { user } } = await sbClient.auth.getUser();

    if (user) {
        // --- USUÁRIO LOGADO ---
        let primeiroNome = 'Minha Conta';
        let isAdmin = false;

        try {
            const { data: perfil } = await sbClient
                .from('usu_cadastro')
                .select('NOME_USU, admin')
                .eq('EMAIL_USU', user.email)
                .single();

            if (perfil) {
                if (perfil.NOME_USU) primeiroNome = perfil.NOME_USU.split(' ')[0];
                if (perfil.admin === 1) isAdmin = true;
            }
        } catch (error) { console.log('Erro perfil'); }

        let buttonsHTML = '';

        // LÓGICA DE EXIBIÇÃO DE BOTÕES
        if (isAdmin) {
            // SE FOR ADMIN: Mostra APENAS o Painel
            buttonsHTML += `
                <a href="admin.html" style="background-color: #333; color: #f0c029; border: 1px solid #f0c029; padding: 6px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 0.9em; margin-right: 15px; transition: 0.3s; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.backgroundColor='#f0c029'; this.style.color='#000';" onmouseout="this.style.backgroundColor='#333'; this.style.color='#f0c029';">
                    <i class="fas fa-user-shield"></i> Painel de Admin
                </a>
            `;
        } else {
            // SE FOR CLIENTE: Mostra "Meus Orçamentos" (Estilizado igual ao Admin)
            buttonsHTML += `
                <a href="consultar_orcamento.html" style="background-color: #333; color: #f0c029; border: 1px solid #f0c029; padding: 6px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 0.9em; margin-right: 15px; transition: 0.3s; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.backgroundColor='#f0c029'; this.style.color='#000';" onmouseout="this.style.backgroundColor='#333'; this.style.color='#f0c029';">
                    <i class="fas fa-list-ul"></i> Meus Orçamentos
                </a>
            `;
        }

        // Botão Perfil (Comum a todos)
        buttonsHTML += `
            <a href="perfil.html" class="btn-user-logged" style="color: #f0c029; text-decoration: none; margin-right: 15px; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fas fa-user-circle"></i> ${primeiroNome}
            </a>
            <button id="btn-logout" style="background: transparent; border: 1px solid #666; color: #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                Sair <i class="fas fa-sign-out-alt"></i>
            </button>
        `;

        loginArea.innerHTML = buttonsHTML;

        document.getElementById('btn-logout').addEventListener('click', async() => {
            await sbClient.auth.signOut();
            window.location.href = 'index.html';
        });

    } else {
        // --- USUÁRIO DESLOGADO ---
        loginArea.innerHTML = `
            <a href="#" id="btn-open-login" style="color: #fff; text-decoration: none; margin-right: 15px; font-weight: 500;">Entrar</a>
            <a href="cadastro.html" class="btn-cta" style="background-color: #f0c029; color: #1a1a1a; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold;">Criar Conta</a>
        `;

        const btnOpenLogin = document.getElementById('btn-open-login');
        if (btnOpenLogin) {
            btnOpenLogin.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'flex';
            });
        }
    }
}

// --- RODAPÉ ---
function updateFooter() {
    const footerContainer = document.querySelector('footer .container');
    if (footerContainer) {
        footerContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; flex-wrap: wrap; gap: 20px;">
                <div class="footer-col" style="flex: 1; min-width: 200px; text-align: left;">
                    <h4 style="color: #f0c029; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em; border-bottom: 1px solid #444; display: inline-block; padding-bottom: 5px;">SR Service</h4>
                    <p style="margin: 5px 0; color: #ccc; font-size: 0.9em;">CNPJ: 00.000.000/0001-00</p>
                    <p style="margin: 5px 0; color: #ccc; font-size: 0.9em;">Brasílio Custódio de Camargo, 109</p>
                    <p style="margin: 5px 0; color: #ccc; font-size: 0.9em;">CEP: 18890-762</p>
                    <p style="margin: 15px 0 0 0; color: #777; font-size: 0.8em;">&copy; 2025 Todos os direitos reservados.</p>
                </div>

                <div class="footer-col" style="flex: 1; min-width: 200px; text-align: center;">
                    <h4 style="color: #f0c029; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em;">Mapa do Site</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
                        <li><a href="index.html" style="color: #ccc; text-decoration: none;">Início</a></li>
                        <li><a href="servicos.html" style="color: #ccc; text-decoration: none;">Serviços</a></li>
                        <li><a href="sobre_nos.html" style="color: #ccc; text-decoration: none;">Sobre Nós</a></li>
                        <li><a href="orcamento.html" style="color: #ccc; text-decoration: none;">Solicitar Orçamento</a></li>
                         <li><a href="politica_privacidade.html" style="color: #ccc; text-decoration: none;">Política de Privacidade</a></li>
                    </ul>
                </div>
                
                <div class="footer-col" style="flex: 1; min-width: 200px; text-align: right;">
                    <h4 style="color: #f0c029; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em; border-bottom: 1px solid #444; display: inline-block; padding-bottom: 5px;">Contato</h4>
                    <p style="margin: 5px 0; color: #ccc; font-size: 0.9em;"><i class="fas fa-phone" style="margin-right:8px; color:#f0c029;"></i> (14) 99700-0206</p>
                    <p style="margin: 5px 0; color: #ccc; font-size: 0.9em;"><i class="fas fa-envelope" style="margin-right:8px; color:#f0c029;"></i> adrekzo44@gmail.com</p>
                    
                    <div class="footer-social" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 15px;">
                        <a href="https://wa.me/5514997000206" target="_blank" style="color: #f0c029; font-size: 1.5em;"><i class="fab fa-whatsapp"></i></a>
                        <a href="https://www.instagram.com/styvezatto/" target="_blank" style="color: #f0c029; font-size: 1.5em;"><i class="fab fa-instagram"></i></a>
                        <a href="https://www.linkedin.com/in/adrian-ezequiel-5720503a0/" target="_blank" style="color: #f0c029; font-size: 1.5em;"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
            </div>
        `;
    }
}

// --- MODAL DE LOGIN ---
function injectLoginModalHTML() {
    if (document.getElementById('login-modal')) return;

    const modalHTML = `
    <div id="login-modal" class="modal-overlay" style="display: none; z-index: 10000;">
        <div class="modal-content login-content" style="max-width: 350px; text-align: center; background: #222; border: 1px solid #f0c029; padding: 30px; border-radius: 8px;">
            <div class="modal-header" style="border-bottom: 1px solid #444; margin-bottom: 20px; padding-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; color: #f0c029;">Acessar Conta</h3>
                <span class="modal-close" id="close-login" style="cursor:pointer; color:#fff; font-size:1.5em;">&times;</span>
            </div>
            <div class="modal-body">
                <form id="form-login-modal">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="color: #ccc; font-size: 0.9em;">E-mail</label>
                        <input type="email" id="email-login" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; margin-top: 5px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="color: #ccc; font-size: 0.9em;">Senha</label>
                        <input type="password" id="senha-login" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; margin-top: 5px; box-sizing: border-box;">
                    </div>
                    <button type="submit" style="width: 100%; padding: 12px; background: #f0c029; color: #000; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.backgroundColor='#d4a910'" onmouseout="this.style.backgroundColor='#f0c029'">ENTRAR</button>
                </form>
                <div style="margin-top: 15px; font-size: 0.9em;">
                    <a href="#" id="link-esqueci-senha" style="color: #f0c029; text-decoration: none;">Esqueci minha senha</a>
                    <br><br>
                    <span style="color: #888;">Não tem conta?</span> <a href="cadastro.html" style="color: #fff; text-decoration: underline;">Cadastre-se</a>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-login').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('login-modal');
        if (e.target === modal) modal.style.display = 'none';
    });

    document.getElementById('link-esqueci-senha').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-modal').style.display = 'none';
        handleForgotPassword();
    });

    document.getElementById('form-login-modal').addEventListener('submit', async(e) => {
        e.preventDefault();
        const email = document.getElementById('email-login').value;
        const password = document.getElementById('senha-login').value;
        const btn = e.target.querySelector('button');

        const originalText = btn.innerText;
        btn.innerText = 'Verificando...';
        btn.disabled = true;

        const sbClient = window.supabase;
        if (!sbClient) {
            alert('Erro de sistema: Cliente não carregado.');
            return;
        }

        const { error } = await sbClient.auth.signInWithPassword({ email, password });

        if (error) {
            showCustomModal('E-mail ou senha incorretos.', 'Erro de Login');
            btn.innerText = originalText;
            btn.disabled = false;
        } else {
            window.location.reload();
        }
    });
}

// --- RECUPERAÇÃO DE SENHA ---
async function handleForgotPassword() {
    const email = await showCustomModal("Digite seu e-mail para receber o link de recuperação:", "Recuperar Senha", true);

    if (email) {
        let redirectUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/recuperar_senha.html';

        const sbClient = window.supabase;
        const { error } = await sbClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

        if (error) {
            showCustomModal("Erro ao enviar: " + error.message, "Erro");
        } else {
            showCustomModal("Link de recuperação enviado! Verifique seu e-mail (inclusive spam).", "Sucesso");
        }
    }
}

// --- MODAL CUSTOMIZADO ---
function injectCustomModalHTML() {
    if (!document.getElementById('custom-modal')) {
        const modalHTML = `
        <div id="custom-modal" class="modal-overlay" style="display: none; z-index: 11000;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-title">Aviso</h3>
                    <span class="modal-close-custom">&times;</span>
                </div>
                <div class="modal-body">
                    <p id="modal-message" style="line-height: 1.6;"></p>
                    <input type="email" id="modal-input" placeholder="Seu e-mail..." style="display: none; width: 100%; margin-top: 15px; padding: 10px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px;">
                </div>
                <div class="modal-footer">
                    <button id="modal-ok-btn">OK</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const style = document.createElement('style');
        style.innerHTML = `
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; }
            .modal-content { background: #1a1a1a; border: 1px solid #f0c029; color: #fff; padding: 25px; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); animation: fadeIn 0.3s; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .modal-header h3 { color: #f0c029; margin: 0; font-size: 1.4em; }
            .modal-close-custom { cursor: pointer; font-size: 1.5em; color: #666; transition: 0.2s; }
            .modal-close-custom:hover { color: #fff; }
            .modal-footer { margin-top: 25px; text-align: right; }
            #modal-ok-btn { background: #f0c029; border: none; padding: 10px 25px; color: #1a1a1a; font-weight: bold; cursor: pointer; border-radius: 4px; transition: 0.2s; }
            #modal-ok-btn:hover { background: #d4a910; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);

        document.querySelector('.modal-close-custom').addEventListener('click', () => {
            document.getElementById('custom-modal').style.display = 'none';
        });
    }
}

window.showCustomModal = function(message, title = 'Aviso', hasInput = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;

        const input = document.getElementById('modal-input');
        const btn = document.getElementById('modal-ok-btn');
        const closeBtn = document.querySelector('.modal-close-custom');

        if (hasInput) {
            input.style.display = 'block';
            input.value = '';
            input.focus();
        } else {
            input.style.display = 'none';
        }

        modal.style.display = 'flex';

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        const close = () => {
            modal.style.display = 'none';
            if (hasInput) resolve(input.value);
            else resolve(true);
        };

        newBtn.addEventListener('click', close);
        closeBtn.onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
    });
};