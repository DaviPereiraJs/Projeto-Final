document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : `${location.protocol}//${location.hostname}:3000`;

    const usersTableBody = document.getElementById('users-table-body');
    const addUserForm = document.getElementById('add-user-form');
    const addPaymentForm = document.getElementById('add-payment-form');
    const paymentUserSelect = document.getElementById('payment-user-id');
    const validatePaymentForm = document.getElementById('validate-payment-form');
    const validateUserSelect = document.getElementById('validate-user-id');
    const totalRevenueDisplay = document.getElementById('total-revenue');
    const activeUsersDisplay = document.getElementById('active-users');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const endMonthButton = document.getElementById('end-month-button');
    const historyTableBody = document.getElementById('history-table-body');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const adminMain = document.querySelector('#admin-panel main');

    let usersData = [];

    // Função para formatar o valor
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Função para formatar o WhatsApp
    const formatWhatsapp = (number) => {
        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length === 11) {
            return `(${cleanNumber.substring(0, 2)}) ${cleanNumber.substring(2, 7)}-${cleanNumber.substring(7, 11)}`;
        }
        return number;
    };

    // Função para carregar usuários e atualizar a tabela
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`);
            const users = await response.json();
            usersData = users;
            usersTableBody.innerHTML = '';
            paymentUserSelect.innerHTML = '<option value="">Selecione um Usuário</option>';
            validateUserSelect.innerHTML = '<option value="">Selecione um Usuário</option>';

            users.forEach(user => {
                // Preenche a tabela de usuários
                const row = document.createElement('tr');
                const lastPaymentDate = user.last_payment_date ? new Date(user.last_payment_date) : null;
                let statusText = 'Não Pago';
                let statusClass = 'unpaid';

                if (lastPaymentDate) {
                    const hoje = new Date();
                    const diasDesdePagamento = Math.floor((hoje - lastPaymentDate) / (1000 * 60 * 60 * 24));
                    if (diasDesdePagamento > 30) {
                        statusText = 'Atrasado';
                        statusClass = 'overdue';
                    } else {
                        statusText = 'Pago';
                        statusClass = 'paid';
                    }
                }

                const userLink = `file://${window.location.pathname.replace('index.html', '')}usuario.html?id=${user.id}`;
                
                row.innerHTML = `
                    <td>${user.name} ${user.surname}</td>
                    <td>${formatWhatsapp(user.whatsapp)}</td>
                    <td>${lastPaymentDate ? lastPaymentDate.toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td class="status-cell ${statusClass}">${statusText}</td>
                    <td class="action-buttons">
                        <a href="${userLink}" class="btn-link" target="_blank">Link de Acesso</a>
                        <button class="btn-delete" data-user-id="${user.id}">Excluir</button>
                    </td>
                `;
                usersTableBody.appendChild(row);

                // Preenche os dropdowns de pagamentos
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name} ${user.surname}`;
                paymentUserSelect.appendChild(option);
                validateUserSelect.appendChild(option.cloneNode(true));
            });
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
        }
    };

    // Função para carregar o resumo mensal
    const fetchMonthlySummary = async () => {
        try {
            const response = await fetch(`${API_URL}/monthly-summary`);
            const summary = await response.json();
            totalRevenueDisplay.textContent = formatCurrency(summary.total_revenue);
            activeUsersDisplay.textContent = summary.active_users;
            const now = new Date();
            currentMonthDisplay.textContent = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        } catch (error) {
            console.error("Erro ao carregar resumo mensal:", error);
        }
    };

    // Função para carregar o histórico
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/history`);
            const history = await response.json();
            historyTableBody.innerHTML = '';
            history.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(item.year, item.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</td>
                    <td>${formatCurrency(item.total_revenue)}</td>
                    <td>${item.active_users}</td>
                `;
                historyTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        }
    };

    // Ação de adicionar usuário
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUser = {
            name: document.getElementById('user-name').value,
            surname: document.getElementById('user-surname').value,
            whatsapp: document.getElementById('user-whatsapp').value
        };
        try {
            await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            alert('Usuário adicionado com sucesso!');
            addUserForm.reset();
            fetchUsers();
        } catch (error) {
            alert('Erro ao adicionar usuário.');
        }
    });

    // Ação de registrar pagamento manual
    addPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payment = {
            userId: parseInt(document.getElementById('payment-user-id').value),
            date: document.getElementById('payment-date').value,
            amount: parseFloat(document.getElementById('payment-amount').value)
        };
        try {
            await fetch(`${API_URL}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payment)
            });
            alert('Pagamento registrado com sucesso!');
            addPaymentForm.reset();
            fetchUsers();
            fetchMonthlySummary();
        } catch (error) {
            alert('Erro ao registrar pagamento.');
        }
    });

    // Ação de registrar pagamento com validação via comprovante
    validatePaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(validatePaymentForm);
        const userId = formData.get('validate-user-id');
        const date = formData.get('validate-date');
        const amount = formData.get('validate-amount');
        const receipt = formData.get('receipt');

        // Adiciona os outros campos ao FormData
        formData.append('userId', userId);
        formData.append('date', date);
        formData.append('amount', amount);
        
        try {
            const response = await fetch(`${API_URL}/payments/validate`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('Pagamento validado e registrado com sucesso!');
                validatePaymentForm.reset();
                fetchUsers();
                fetchMonthlySummary();
            } else {
                const error = await response.json();
                alert(`Erro na validação do comprovante: ${error.error}`);
            }
        } catch (error) {
            alert('Erro de conexão ao validar o comprovante.');
        }
    });

    // Ação de exclusão (delegação de evento)
    usersTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const userId = e.target.dataset.userId;
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                try {
                    const response = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Usuário excluído com sucesso!');
                        fetchUsers();
                    } else {
                        const error = await response.json();
                        alert(`Erro ao excluir: ${error.message}`);
                    }
                } catch (error) {
                    alert('Erro de conexão ao excluir usuário.');
                }
            }
        }
    });

    // Lógica dos cards interativos (corrigido)
    document.querySelectorAll('.interactive-card').forEach(card => {
        const toggleButton = card.querySelector('.toggle-details-button');

        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();

                const isExpanded = card.classList.contains('expanded');

                if (isExpanded) {
                    card.classList.remove('expanded');
                    adminMain.classList.remove('has-expanded-card');
                    toggleButton.textContent = 'Ver Detalhes';
                } else {
                    document.querySelectorAll('.interactive-card.expanded').forEach(expandedCard => {
                        expandedCard.classList.remove('expanded');
                        const otherButton = expandedCard.querySelector('.toggle-details-button');
                        if (otherButton) {
                            otherButton.textContent = 'Ver Detalhes';
                        }
                    });
                    card.classList.add('expanded');
                    adminMain.classList.add('has-expanded-card');
                    toggleButton.textContent = 'Ocultar';
                }
            });
        }
    });

    // Botão para finalizar o mês
    endMonthButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja finalizar o mês e arquivar os dados? Esta ação não pode ser desfeita.')) {
            try {
                const response = await fetch(`${API_URL}/end-of-month`, { method: 'POST' });
                if (response.ok) {
                    alert('Mês finalizado com sucesso!');
                    fetchMonthlySummary();
                    fetchHistory();
                    fetchUsers();
                } else {
                    const error = await response.json();
                    alert(`Erro ao finalizar o mês: ${error.message}`);
                }
            } catch (error) {
                alert('Erro de conexão ao finalizar o mês.');
            }
        }
    });

    // Lógica de alternar tema
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggleButton.textContent = isDarkMode ? '☀️' : '🌙';
    });

    // Carregar o tema salvo
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleButton.textContent = '☀️';
    }

    // Carrega os dados iniciais
    await fetchUsers();
    await fetchMonthlySummary();
    await fetchHistory();
});