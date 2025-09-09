document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : `${location.protocol}//${location.hostname}:3000`;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    const userInfoContainer = document.getElementById('user-info-container');
    const notFoundContainer = document.getElementById('not-found-container');
    const userNameDisplay = document.getElementById('user-name-display');
    const userStatusDisplay = document.getElementById('user-status-display');
    const paymentsHistoryTableBody = document.querySelector('#payments-history-table tbody');
    const themeToggleButton = document.getElementById('theme-toggle-button');

    if (!userId) {
        userInfoContainer.style.display = 'none';
        notFoundContainer.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        
        if (!response.ok) {
            userInfoContainer.style.display = 'none';
            notFoundContainer.style.display = 'block';
            return;
        }

        const usuario = await response.json();
        
        userInfoContainer.style.display = 'block';
        userNameDisplay.textContent = `${usuario.name} ${usuario.surname}`;

        let statusText = 'Não Pago';
        let statusClass = 'unpaid';

        if (usuario.payments && usuario.payments.length > 0) {
            const lastPaymentDate = new Date(usuario.payments[0].date);
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
        
        userStatusDisplay.textContent = `Status: ${statusText}`;
        userStatusDisplay.classList.add(statusClass);

        if (usuario.payments && usuario.payments.length > 0) {
            paymentsHistoryTableBody.innerHTML = '';
            usuario.payments.forEach(payment => {
                const row = document.createElement('tr');
                const dataFormatada = new Date(payment.date).toLocaleDateString('pt-BR');
                row.innerHTML = `
                    <td>${dataFormatada}</td>
                    <td>R$ ${payment.amount.toFixed(2).replace('.', ',')}</td>
                `;
                paymentsHistoryTableBody.appendChild(row);
            });
        } else {
            paymentsHistoryTableBody.innerHTML = '<tr><td colspan="2">Nenhum pagamento registrado.</td></tr>';
        }

    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        userInfoContainer.style.display = 'none';
        notFoundContainer.style.display = 'block';
    }

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
});