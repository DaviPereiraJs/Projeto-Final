class Payment {
    constructor(id, user_id, date, amount) {
        this.id = id;
        this.user_id = user_id;
        this.date = date;
        this.amount = amount;
    }
}

module.exports = Payment;
