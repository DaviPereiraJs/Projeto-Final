class MonthlyResultDAO {
    constructor(db) {
        this.db = db;
    }

    async getCurrentMonthSummary() {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const monthString = currentMonth.toString().padStart(2, '0');

            const sql = `
                SELECT 
                    SUM(amount) AS total_revenue, 
                    COUNT(DISTINCT user_id) AS active_users 
                FROM payments 
                WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
            `;
            this.db.get(sql, [monthString, currentYear.toString()], (err, row) => {
                if (err) {
                    reject(err);
                }
                resolve({
                    total_revenue: row.total_revenue || 0,
                    active_users: row.active_users || 0
                });
            });
        });
    }

    async findAll() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM monthly_results ORDER BY year DESC, month DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        });
    }

    async endOfMonth() {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const monthString = currentMonth.toString().padStart(2, '0');

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION;');

                const sqlSummary = `
                    SELECT SUM(amount) AS total_revenue, COUNT(DISTINCT user_id) AS active_users 
                    FROM payments 
                    WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
                `;

                this.db.get(sqlSummary, [monthString, currentYear.toString()], (err, row) => {
                    if (err) {
                        this.db.run('ROLLBACK;');
                        return reject(err);
                    }

                    const totalRevenue = row.total_revenue || 0;
                    const activeUsers = row.active_users || 0;

                    const sqlInsert = `
                        INSERT INTO monthly_results (month, year, total_revenue, active_users) 
                        VALUES (?, ?, ?, ?)
                    `;
                    this.db.run(sqlInsert, [currentMonth, currentYear, totalRevenue, activeUsers], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK;');
                            return reject(err);
                        }

                        this.db.run(`DELETE FROM payments WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [monthString, currentYear.toString()], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK;');
                                return reject(err);
                            }
                            this.db.run('COMMIT;');
                            resolve();
                        });
                    });
                });
            });
        });
    }
}

module.exports = MonthlyResultDAO;