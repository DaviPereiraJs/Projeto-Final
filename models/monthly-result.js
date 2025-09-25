class MonthlyResult {
    constructor(id, month, year, total_revenue, active_users) {
        this.id = id;
        this.month = month;
        this.year = year;
        this.total_revenue = total_revenue;
        this.active_users = active_users;
    }
}

module.exports = MonthlyResult;
