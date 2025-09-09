const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');

// Configuração do Multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// Importa as classes DAO
const UserDAO = require('./daos/user-dao');
const PaymentDAO = require('./daos/payment-dao');
const MonthlyResultDAO = require('./daos/monthly-result-dao');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run("PRAGMA foreign_keys = ON;");
    }
});

// Instancia os DAOs
const userDAO = new UserDAO(db);
const paymentDAO = new PaymentDAO(db);
const monthlyResultDAO = new MonthlyResultDAO(db);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        whatsapp TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS monthly_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_revenue REAL NOT NULL,
        active_users INTEGER NOT NULL
    )`);
    console.log('Tabelas "users", "payments" e "monthly_results" prontas.');
});

// Rota para adicionar um novo usuário
app.post('/users', async (req, res) => {
    const { name, surname, whatsapp } = req.body;
    try {
        const lastID = await userDAO.save({ name, surname, whatsapp });
        res.status(201).json({ id: lastID, name, surname, whatsapp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para listar todos os usuários e seus pagamentos
app.get('/users', async (req, res) => {
    try {
        const users = await userDAO.findAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para buscar um único usuário e seus pagamentos
app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await userDAO.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const payments = await paymentDAO.findByUserId(userId);
        res.json({ ...user, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para deletar um usuário
app.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const changes = await userDAO.delete(userId);
        if (changes > 0) {
            res.status(200).json({ message: 'Usuário e pagamentos relacionados removidos com sucesso!' });
        } else {
            res.status(404).json({ message: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para registrar um novo pagamento
app.post('/payments', async (req, res) => {
    const { userId, date, amount } = req.body;
    try {
        const lastID = await paymentDAO.save({ userId, date, amount });
        res.status(201).json({ id: lastID, userId, date, amount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para registrar pagamento com validação via OCR (melhoria)
app.post('/payments/validate', upload.single('receipt'), async (req, res) => {
    try {
        const { userId, date, amount } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum comprovante enviado.' });
        }

        const filePath = req.file.path;
        
        // 1. Ler o texto da imagem usando Tesseract.js
        const { data: { text } } = await Tesseract.recognize(
            filePath,
            'por', // Idioma português
            { logger: m => console.log(m.status) }
        );

        // 2. Lógica de Validação
        const validationSuccessful = validateReceipt(text, amount);

        if (!validationSuccessful) {
            fs.unlinkSync(filePath); // Apaga o arquivo
            return res.status(400).json({ error: 'Comprovante inválido. Valor não encontrado.' });
        }

        // 3. Se válido, salva o pagamento
        const lastID = await paymentDAO.save({ userId, date, amount });
        
        // 4. Apaga o arquivo temporário
        fs.unlinkSync(filePath); 

        res.status(201).json({ id: lastID, userId, date, amount, message: 'Pagamento registrado e comprovante validado!' });

    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Erro no processamento do comprovante.' });
    }
});

// Função auxiliar de validação (exemplo básico)
function validateReceipt(text, expectedAmount) {
    const cleanedText = text.replace(/ /g, '').toLowerCase();
    const cleanedAmount = parseFloat(expectedAmount).toFixed(2).replace('.', ',');
    return cleanedText.includes(cleanedAmount.replace(/,/g, ''));
}


// Rota para obter resultados do mês atual
app.get('/monthly-summary', async (req, res) => {
    try {
        const summary = await monthlyResultDAO.getCurrentMonthSummary();
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para obter histórico de meses anteriores
app.get('/history', async (req, res) => {
    try {
        const history = await monthlyResultDAO.findAll();
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para finalizar o mês e arquivar os dados
app.post('/end-of-month', async (req, res) => {
    try {
        await monthlyResultDAO.endOfMonth();
        res.json({ message: 'Dados do mês finalizados e arquivados com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});