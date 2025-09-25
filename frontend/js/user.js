document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userLink = params.get('id');
    const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : `${location.protocol}//${location.hostname}:3000`;

    const userNameDisplay = document.getElementById('user-name-display');
    const userStatusDisplay = document.getElementById('user-status-display');
    const paymentsHistoryTableBody = document.querySelector('#payments-history-table tbody');
    const notFoundContainer = document.getElementById('not-found-container');
    const userInfoContainer = document.getElementById('user-info-container');
    const deleteButton = document.getElementById('delete-button');
    const deleteMessage = document.getElementById('delete-message');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    
    // Elementos do card de pagamento manual
    const pixCodeTextarea = document.getElementById('pix-code');
    const copyPixButton = document.getElementById('copy-pix-button');
    const whatsappLink = document.getElementById('whatsapp-link');
    const monthlyAmountSpan = document.getElementById('monthly-amount');

    let userData = null;

    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });

    // ===== funções utilitárias =====
    const updateStatus = () => {
        let statusText = 'Não Pago', statusClass = 'unpaid';
        if (userData.payments && userData.payments.length) {
            const lastPayment = new Date(userData.payments[0].date);
            const diffDays = Math.floor((new Date() - lastPayment) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) { statusText = 'Atrasado'; statusClass = 'overdue'; }
            else { statusText = 'Pago'; statusClass = 'paid'; }
        }
        userStatusDisplay.textContent = statusText;
        userStatusDisplay.className = `status ${statusClass}`;
    };

    const renderPayments = () => {
        paymentsHistoryTableBody.innerHTML = '';
        if (userData.payments && userData.payments.length) {
            userData.payments.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString('pt-BR')}</td>
                                <td>${p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
                paymentsHistoryTableBody.appendChild(tr);
            });
        } else {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="2" style="text-align:center;color:gray;">Sem pagamentos registrados</td>`;
            paymentsHistoryTableBody.appendChild(tr);
        }
    };

    const loadUser = async () => {
        try {
            const resUser = await fetch(`${API_URL}/user-by-link/${userLink}`);
            if (!resUser.ok) throw new Error('Usuário não encontrado');
            userData = await resUser.json();

            userInfoContainer.style.display = 'block';
            notFoundContainer.style.display = 'none';

            userNameDisplay.textContent = `${userData.name} ${userData.surname || ''}`;
            updateStatus();
            renderPayments();
        } catch (err) {
            userInfoContainer.style.display = 'none';
            notFoundContainer.style.display = 'block';
        }
    };
    
    await loadUser();

    // ===== Lógica de Pagamento Manual =====
    if (copyPixButton && pixCodeTextarea) {
        copyPixButton.addEventListener('click', () => {
            pixCodeTextarea.select();
            document.execCommand('copy');
            alert('Chave Pix copiada para a área de transferência!');
        });
    }

    if (whatsappLink && monthlyAmountSpan) {
        whatsappLink.addEventListener('click', (e) => {
            const adminWhatsappNumber = "5588981522318"; // SUBSTITUA POR SEU NÚMERO DE WHATSAPP
            const monthlyAmount = monthlyAmountSpan.textContent;
            const userName = userNameDisplay.textContent; // PEGA O NOME DO USUÁRIO
            
            const message = `Olá! O usuário ${userName} acabou de fazer um pagamento de mensalidade no valor de ${monthlyAmount}. O comprovante está anexo. Pode verificar, por favor?`;

            e.target.href = `https://wa.me/${adminWhatsappNumber}?text=${encodeURIComponent(message)}`;
        });
    }

    // ===== excluir usuário =====
    deleteButton.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;

        try {
            const response = await fetch(`${API_URL}/users/${userData.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha ao excluir usuário');

            deleteMessage.textContent = 'Conta excluída com sucesso!';
            deleteMessage.style.color = 'var(--secondary-color)';

            userInfoContainer.style.display = 'none';
            notFoundContainer.style.display = 'block';
            notFoundContainer.querySelector('p').textContent = 'Esta conta foi removida.';
        } catch (err) {
            deleteMessage.textContent = err.message || 'Erro ao excluir usuário.';
            deleteMessage.style.color = 'var(--danger-color)';
        }
    });
});