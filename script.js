document.addEventListener('DOMContentLoaded', () => {
    injectCustomModalHTML(); // Injeta o HTML do modal na página

    // Detecta recuperação de senha na URL
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        // Redireciona para a página de recuperação se não estiver nela
        if (!window.location.pathname.includes('recuperar_senha.html')) {
            window.location.href = 'recuperar_senha.html' + window.location.hash;
            return;
        }
    }

    if (typeof setupHeader === 'function') {
        setupHeader();
    }
});

// --- LÓGICA DO MODAL CUSTOMIZADO ---
let modalResolve = null;

function injectCustomModalHTML() {
    if (!document.getElementById('customModalOverlay')) {
        const modalHTML = `
            <div id="customModalOverlay" class="custom-modal-overlay">
                <div class="custom-modal">
                    <h3 id="customModalTitle">Aviso</h3>
                    <p id="customModalMessage">Mensagem aqui</p>
                    <div id="customModalInputContainer" class="custom-modal-input-container">
                        <input type="text" id="customModalInput" placeholder="">
                    </div>
                    <div class="modal-buttons">
                        <button class="custom-modal-btn cancel" id="customModalCancelBtn" style="display:none;">Cancelar</button>
                        <button class="custom-modal-btn" id="customModalBtn">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('customModalBtn').addEventListener('click', () => closeModal(true));
        document.getElementById('customModalCancelBtn').addEventListener('click', () => closeModal(false));
        document.getElementById('customModalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'customModalOverlay') closeModal(false);
        });

        // Permitir "Enter" no input
        document.getElementById('customModalInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') closeModal(true);
        });
    }
}

// Função universal para Modais e Prompts
window.showCustomModal = function(message, title = "Atenção", isPrompt = false) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const titleElem = document.getElementById('customModalTitle');
        const msgElem = document.getElementById('customModalMessage');
        const inputContainer = document.getElementById('customModalInputContainer');
        const inputElem = document.getElementById('customModalInput');
        const cancelBtn = document.getElementById('customModalCancelBtn');

        if (!overlay) {
            alert(message);
            resolve(null);
            return;
        }

        titleElem.innerText = title;
        msgElem.innerText = message;
        modalResolve = resolve;

        if (isPrompt) {
            inputContainer.style.display = 'block';
            cancelBtn.style.display = 'block';
            inputElem.value = '';
            inputElem.focus();
        } else {
            inputContainer.style.display = 'none';
            cancelBtn.style.display = 'none';
        }

        overlay.classList.add('active');
    });
}

function closeModal(confirmed) {
    const overlay = document.getElementById('customModalOverlay');
    const inputElem = document.getElementById('customModalInput');

    if (overlay) overlay.classList.remove('active');

    if (modalResolve) {
        const value = inputElem.value;
        const isPrompt = document.getElementById('customModalInputContainer').style.display === 'block';

        if (isPrompt) {
            modalResolve(confirmed ? value : null);
        } else {
            modalResolve(true);
        }
        modalResolve = null;
    }
}

// --- HEADER E LOGIN ---
async function setupHeader() {
    const loginArea = document.querySelector('.login-area');
    if (!loginArea) return;

    if (typeof supabase === 'undefined') return;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // --- LOGADO ---
        const { data: perfil } = await supabase
            .from('usu_cadastro')
            .select('admin')
            .eq('EMAIL_USU', user.email)
            .single();

        const isAdmin = perfil && perfil.admin === 1;

        if (isAdmin) {
            // ADMIN VÊ: Botão Admin, Meu Perfil, Sair (Sem "Meus Orçamentos")
            loginArea.innerHTML = `
                <a href="admin.html" class="admin-btn register-btn">Painel Admin</a>
                <a href="perfil.html" class="register-btn">Meu Perfil</a>
                <button id="logoutBtn" class="logout-btn">Sair</button>
            `;
        } else {
            // CLIENTE VÊ: Meus Orçamentos, Meu Perfil, Sair
            loginArea.innerHTML = `
                <a href="consultar_orcamento.html" class="register-btn">Meus Orçamentos</a>
                <a href="perfil.html" class="register-btn">Meu Perfil</a>
                <button id="logoutBtn" class="logout-btn">Sair</button>
            `;
        }

        document.getElementById('logoutBtn').addEventListener('click', async() => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

    } else {
        // --- DESLOGADO ---
        loginArea.innerHTML = `
            <button class="login-btn" id="loginBtn">Entrar</button>
            <a href="cadastro.html" class="register-btn">Cadastre-se</a>
            
            <div class="login-popup" id="loginPopup">
                <button class="close-btn" id="closeBtn"><i class="fas fa-times"></i></button>
                <h3 style="color:#f0c029; margin-bottom:15px; text-align:center; font-family:'RopaSans-Regular', sans-serif;">Acesse sua Conta</h3>
                <form id="loginForm">
                    <input type="email" id="email" name="email" placeholder="Seu E-mail" required>
                    <input type="password" id="senha" name="senha" placeholder="Sua Senha" required>
                    <button type="submit" class="submit-login">Entrar</button>
                    <a id="forgotPasswordBtn" class="forgot-password">Esqueceu a senha?</a>
                </form>
            </div>
        `;

        setupLoginEvents();
    }
}

function setupLoginEvents() {
    const loginBtn = document.getElementById('loginBtn');
    const loginPopup = document.getElementById('loginPopup');
    const closeBtn = document.getElementById('closeBtn');
    const loginForm = document.getElementById('loginForm');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loginPopup.classList.toggle('show');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => loginPopup.classList.remove('show'));
    }
    window.addEventListener('click', (e) => {
        if (loginPopup && loginPopup.classList.contains('show') && !loginPopup.contains(e.target) && e.target !== loginBtn) {
            loginPopup.classList.remove('show');
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('senha').value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showCustomModal('E-mail ou senha incorretos.', 'Erro de Acesso');
            } else {
                window.location.href = 'perfil.html';
            }
        });
    }

    if (forgotBtn) {
        forgotBtn.addEventListener('click', handleForgotPassword);
    }
}

async function handleForgotPassword() {
    const emailInput = document.getElementById('email');
    let email = emailInput ? emailInput.value : '';

    if (!email) {
        email = await showCustomModal("Digite seu e-mail para envio do link de recuperação:", "Recuperar Senha", true);
    }

    if (email) {
        let redirectUrl = window.location.origin + '/recuperar_senha.html';

        // Correção para quem roda localmente via arquivo (file://)
        if (window.location.protocol === 'file:') {
            await showCustomModal(
                "Atenção: Você está rodando via arquivo local.\nO link enviado apontará para 'http://127.0.0.1:5500'.\nUse o Live Server.",
                "Modo de Desenvolvimento"
            );
            redirectUrl = 'http://127.0.0.1:5500/recuperar_senha.html';
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) {
            showCustomModal("Erro ao enviar: " + error.message, "Erro");
        } else {
            showCustomModal("Enviamos um link de recuperação para " + email + ".\nVerifique sua caixa de entrada.", "E-mail Enviado");
        }
    }
}