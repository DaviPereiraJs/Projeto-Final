const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// --- Configurações de Sessão ---
app.use(session({
    secret: 'sua_chave_secreta_muito_segura',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// --- Configurações de CORS com suporte a credenciais ---
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// --- Banco de Dados ---
const db = new sqlite3.Database('./arena.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Conectado ao SQLite');
});

// --- Criação das tabelas ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT,
        whatsapp TEXT,
        access_link TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS monthly_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month INTEGER,
        year INTEGER,
        total_revenue REAL,
        active_users INTEGER
    )`);
});

// --- Rota que serve a página de login ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// --- Rota que serve a página de usuário ---
app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'usuario.html'));
});

// --- Middleware de Autenticação ---
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Não Autorizado' });
    }
};

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234') {
        req.session.isAuthenticated = true;
        res.status(200).json({ message: 'Login bem-sucedido!' });
    } else {
        res.status(401).json({ error: 'Credenciais inválidas.' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Erro ao fazer logout.' });
        res.status(200).json({ message: 'Logout bem-sucedido!' });
    });
});

// --- Endpoints agora protegidos pelo middleware ---

// Adicionar usuário
app.post('/users', isAuthenticated, (req, res) => {
    const { name, surname, whatsapp } = req.body;
    const access_link = uuidv4();
    const sql = `INSERT INTO users (name, surname, whatsapp, access_link) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, surname, whatsapp, access_link], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, access_link });
    });
});

// Listar todos os usuários
app.get('/users', isAuthenticated, (req, res) => {
    const sql = `SELECT id, name, surname, whatsapp, access_link FROM users ORDER BY id ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Buscar usuário pelo access_link (permanente)
app.get('/user-by-link/:access_link', (req, res) => {
    const link = req.params.access_link;
    const sql = `SELECT * FROM users WHERE access_link = ?`;
    db.get(sql, [link], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        db.all(`SELECT * FROM payments WHERE user_id = ? ORDER BY date DESC`, [user.id], (err, payments) => {
            if (err) return res.status(500).json({ error: err.message });
            user.payments = payments;
            res.json(user);
        });
    });
});

// Excluir usuário
app.delete('/users/:id', isAuthenticated, (req, res) => {
    const userId = req.params.id;
    db.serialize(() => {
        db.run(`DELETE FROM payments WHERE user_id = ?`, [userId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'Usuário excluído com sucesso!' });
            });
        });
    });
});

// Registrar pagamento (Com validação de mês)
app.post('/payments', isAuthenticated, (req, res) => {
    const { user_id, date, amount } = req.body;
    
    const checkSql = `SELECT COUNT(*) AS count FROM payments WHERE user_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', ?)`;
    db.get(checkSql, [user_id, date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row.count > 0) {
            return res.status(400).json({ error: 'Usuário já efetuou o pagamento no mês atual.' });
        }
        
        const insertSql = `INSERT INTO payments (user_id, date, amount) VALUES (?, ?, ?)`;
        db.run(insertSql, [user_id, date, amount], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, user_id, date, amount });
        });
    });
});

// Resumo mensal
app.get('/summary', isAuthenticated, (req, res) => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2,'0');
    const year = now.getFullYear().toString();

    const sql = `SELECT SUM(amount) AS total_revenue, COUNT(DISTINCT user_id) AS active_users
                  FROM payments
                  WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`;
    db.get(sql, [month, year], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ total_revenue: row.total_revenue || 0, active_users: row.active_users || 0 });
    });
});

// Histórico mensal
app.get('/history', isAuthenticated, (req, res) => {
    const sql = `SELECT * FROM monthly_results ORDER BY year DESC, month DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Finalizar mês
app.post('/end-month', isAuthenticated, (req, res) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStr = month.toString().padStart(2,'0');

    db.serialize(() => {
        db.get(`SELECT SUM(amount) AS total_revenue, COUNT(DISTINCT user_id) AS active_users
                 FROM payments
                 WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [monthStr, year.toString()], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const totalRevenue = row.total_revenue || 0;
            const activeUsers = row.active_users || 0;

            db.run(`INSERT INTO monthly_results (month, year, total_revenue, active_users) VALUES (?, ?, ?, ?)`,
                [month, year, totalRevenue, activeUsers], function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    db.run(`DELETE FROM payments WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
                        [monthStr, year.toString()], function(err) {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: 'Mês finalizado com sucesso!' });
                        });
                });
        });
    });
});

// --- Inicializa servidor ---
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));