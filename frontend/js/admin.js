document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : `${location.protocol}//${location.hostname}:3000`;

    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');

    const usersTableBody = document.getElementById('users-table-body');
    const addUserForm = document.getElementById('add-user-form');
    const validatePaymentForm = document.getElementById('validate-payment-form');
    const validateUserSelect = document.getElementById('validate-user-id');
    const totalRevenueDisplay = document.getElementById('total-revenue');
    const activeUsersDisplay = document.getElementById('active-users');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const endMonthButton = document.getElementById('end-month-button');
    const historyTableBody = document.getElementById('history-table-body');
    const themeToggleButton = document.getElementById('theme-toggle-button');

    const mainElement = document.querySelector('main.cards-grid'); // Seleciona o contêiner principal
    const cards = mainElement.querySelectorAll('.interactive-card');

    let usersData = [];
    let historyData = [];

    // --- LÓGICA DE LOGIN NO FRONT-END ---
    const login = () => {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'block';
        renderAll();
    };

    const logout = () => {
        loginContainer.style.display = 'block';
        adminPanel.style.display = 'none';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            login();
            loginError.style.display = 'none';
        } else {
            loginError.textContent = 'Credenciais inválidas.';
            loginError.style.display = 'block';
        }
    });

    logoutButton.addEventListener('click', async () => {
        const res = await fetch(`${API_URL}/logout`, { method: 'POST' });
        if (res.ok) {
            logout();
        } else {
            alert('Erro ao tentar sair.');
        }
    });

    // --- Funções Auxiliares ---
    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const formatWhatsapp = (n) => {
        const clean = n.replace(/\D/g, '');
        return clean.length === 11 ? `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}` : n;
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            if (!res.ok) throw new Error('Falha na autenticação.');
            usersData = await res.json();
            return true;
        } catch (error) {
            logout();
            return false;
        }
    };
    
    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API_URL}/summary`);
            if (!res.ok) throw new Error('Falha na autenticação.');
            return await res.json();
        } catch (error) {
            logout();
            return {};
        }
    };
    
    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/history`);
            if (!res.ok) throw new Error('Falha na autenticação.');
            historyData = await res.json();
        } catch (error) {
            logout();
        }
    };

    // Função de renderização principal
    const renderUsers = async () => {
        const fetchSuccess = await fetchUsers();
        if (!fetchSuccess) return;
        
        usersTableBody.innerHTML = '';
        validateUserSelect.innerHTML = '<option value="">Selecione um Usuário</option>';

        for (const u of usersData) {
            const paymentsRes = await fetch(`${API_URL}/user-by-link/${u.access_link}`);
            const userWithPayments = await paymentsRes.json();
            
            const lastPayment = userWithPayments.payments && userWithPayments.payments.length ? new Date(userWithPayments.payments[0].date) : null;
            const today = new Date();
            let statusText = 'Não Pago', statusClass = 'unpaid';
            
            if (lastPayment) {
                const diffDays = Math.floor((today - lastPayment) / (1000*60*60*24));
                if (diffDays > 30) { statusText = 'Atrasado'; statusClass = 'overdue'; }
                else { statusText = 'Pago'; statusClass = 'paid'; }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${u.name}</td>
                <td>${formatWhatsapp(u.whatsapp)}</td>
                <td>${lastPayment ? lastPayment.toLocaleDateString('pt-BR') : 'N/A'}</td>
                <td class="${statusClass}">${statusText}</td>
                <td class="action-buttons">
                    <button class="btn-delete" data-id="${u.id}">Excluir</button>
                    <button class="btn-link" data-link="${u.access_link}">Copiar Link</button>
                </td>
            `;
            usersTableBody.appendChild(row);

            const option = document.createElement('option');
            option.value = u.id;
            option.textContent = u.name;
            validateUserSelect.appendChild(option);
        }
    };

    const updateSummaryDisplay = async () => {
        try {
            const summary = await fetchSummary();
            totalRevenueDisplay.textContent = formatCurrency(summary.total_revenue);
            activeUsersDisplay.textContent = summary.active_users;
            const now = new Date();
            currentMonthDisplay.textContent = now.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
        } catch (error) {
            logout();
        }
    };

    const renderHistory = () => {
        historyTableBody.innerHTML = '';
        if (historyData && historyData.length) {
            historyData.forEach(h => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(h.year, h.month-1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</td>
                    <td>${formatCurrency(h.total_revenue)}</td>
                    <td>${h.active_users}</td>
                `;
                historyTableBody.appendChild(row);
            });
        }
    };

    const renderAll = async () => {
        try {
            await fetchUsers();
            await fetchHistory();
            renderHistory();
            await updateSummaryDisplay();
            await renderUsers();
        } catch (error) {
            logout();
        }
    };

    // --- EVENTOS ---
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('user-name').value;
        const surname = document.getElementById('user-surname')?.value || '';
        const whatsapp = document.getElementById('user-whatsapp').value;

        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({name,surname,whatsapp})
        });

        if (res.ok) {
            const newUser = await res.json();
            alert(`Usuário adicionado! Link de acesso: ${newUser.access_link}`);
            renderAll();
            addUserForm.reset();
        } else if (res.status === 401) {
            logout();
        } else {
            alert('Erro ao adicionar usuário.');
        }
    });

    usersTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (confirm('Excluir usuário?')) {
                const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    renderAll();
                } else if (res.status === 401) {
                    logout();
                } else {
                    alert('Erro ao excluir usuário.');
                }
            }
        }
        if (e.target.classList.contains('btn-link')) {
            const link = e.target.dataset.link;
            navigator.clipboard.writeText(`${API_URL}/frontend/usuario.html?id=${link}`);
            alert('Link copiado para a área de transferência!');
        }
    });

    validatePaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user_id = validateUserSelect.value;
        const date = document.getElementById('validate-date').value;
        const amount = 30;

        const res = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({user_id,date,amount})
        });

        if (res.ok) {
            alert('Pagamento registrado com sucesso!');
            renderAll();
            validatePaymentForm.reset();
        } else if (res.status === 401) {
            logout();
        } else {
            const err = await res.json();
            alert(err.error);
        }
    });

    endMonthButton.addEventListener('click', async () => {
        if (!confirm('Finalizar mês?')) return;
        const res = await fetch(`${API_URL}/end-month`, { method: 'POST' });
        if (res.ok) {
            alert('Mês finalizado com sucesso!');
            renderAll();
        } else if (res.status === 401) {
            logout();
        } else {
            alert('Erro ao finalizar o mês.');
        }
    });

    // --- Tema ---
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'dark') document.body.classList.add('dark-mode');
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark':'light');
    });

    // --- TOGGLE DOS CARDS ---
    cards.forEach(card => {
        const toggleBtn = card.querySelector('.toggle-details-button');
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = card.classList.contains('expanded');
            cards.forEach(c => c.classList.remove('expanded'));
            if (!isExpanded) card.classList.add('expanded');
            
            const main = card.closest('main');
            if (main) {
                if (document.querySelector('.interactive-card.expanded')) {
                    main.classList.add('has-expanded-card');
                } else {
                    main.classList.remove('has-expanded-card');
                }
            }
        });
    });

    // --- Checa o status do login ao carregar a página (NOVO) ---
    const checkLoginStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            if (res.ok) {
                login();
            } else {
                logout();
            }
        } catch (error) {
            logout();
        }
    };
    checkLoginStatus();
});