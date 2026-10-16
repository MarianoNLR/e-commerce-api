import { ORDER_STATUSES } from './orderStatuses.js'

export class OrderStateMachine {
    constructor(order) {
        this.order = order;
    }

    static validTransitions = {
        [ORDER_STATUSES.PENDING_PAYMENT]: [ORDER_STATUSES.PAID, ORDER_STATUSES.CANCELLED, ORDER_STATUSES.EXPIRED, ORDER_STATUSES.PAYMENT_FAILED],
        [ORDER_STATUSES.PAID]: [ORDER_STATUSES.SHIPPED],
        [ORDER_STATUSES.SHIPPED]: [],
        [ORDER_STATUSES.CANCELLED]: [],
        [ORDER_STATUSES.EXPIRED]: [],
        [ORDER_STATUSES.PAYMENT_FAILED]: []
    }

    canTransitionTo(newStatus) {
        return OrderStateMachine.validTransitions[this.order.status]?.includes(newStatus) ?? false;
    }
}
