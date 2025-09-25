const User = require('../models/user');

class UserDAO {
    constructor(db) {
        this.db = db;
    }

    async findAll() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    users.id, 
                    users.name, 
                    users.surname, 
                    users.whatsapp,
                    users.token,
                    MAX(payments.date) AS last_payment_date
                FROM users
                LEFT JOIN payments ON users.id = payments.user_id
                GROUP BY users.id
                ORDER BY users.id ASC
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async findById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE id = ?`;
            this.db.get(sql, id, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async save(user) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO users (name, surname, whatsapp, token) VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [user.name, user.surname, user.whatsapp, user.token], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async delete(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM users WHERE id = ?`;
            this.db.run(sql, id, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }
}

module.exports = UserDAO;
