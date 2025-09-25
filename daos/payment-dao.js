const Payment = require('../models/payment');

class PaymentDAO {
    constructor(db) {
        this.db = db;
    }

    async save(payment) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO payments (user_id, date, amount) VALUES (?, ?, ?)`;
            this.db.run(sql, [payment.userId, payment.date, payment.amount], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async findByUserId(userId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT date, amount FROM payments WHERE user_id = ? ORDER BY date DESC`;
            this.db.all(sql, userId, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async hasPaidThisMonth(userId, date) {
        return new Promise((resolve, reject) => {
            const dt = new Date(date);
            const month = (dt.getMonth() + 1).toString().padStart(2, '0');
            const year = dt.getFullYear().toString();

            const sql = `
                SELECT COUNT(*) AS count 
                FROM payments 
                WHERE user_id = ? 
                  AND strftime('%m', date) = ? 
                  AND strftime('%Y', date) = ?
            `;
            this.db.get(sql, [userId, month, year], (err, row) => {
                if (err) reject(err);
                else resolve(row.count > 0);
            });
        });
    }
}

module.exports = PaymentDAO;
