class PaymentDAO {
    constructor(db) {
        this.db = db;
    }

    async save(payment) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO payments (user_id, date, amount) VALUES (?, ?, ?)`;
            this.db.run(sql, [payment.userId, payment.date, payment.amount], function(err) {
                if (err) {
                    reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    async findByUserId(userId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT date, amount FROM payments WHERE user_id = ? ORDER BY date DESC`;
            this.db.all(sql, userId, (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        });
    }
}

module.exports = PaymentDAO;