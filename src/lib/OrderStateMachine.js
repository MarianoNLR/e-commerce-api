export class OrderStateMachine {
    constructor(order) {
        this.order = order;
    }

    static validTransitions = {
        'pending_payment': ['paid', 'cancelled', 'expired', 'payment_failed'],
        'paid': ['shipped'],
        'shipped': [],
        'cancelled': [],
        'expired': [],
        'payment_failed': []
    }

    canTransitionTo(newStatus) {
        return OrderStateMachine.validTransitions[this.order.status]?.includes(newStatus) ?? false;
    }
}