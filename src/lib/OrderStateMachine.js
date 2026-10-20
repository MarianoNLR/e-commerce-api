import { ORDER_STATUSES } from './orderStatuses.js'
import { PAYMENT_METHODS } from './paymentMethods.js'

export class OrderStateMachine {
    constructor(order) {
        this.order = order;
    }

    static validTransitions = {
        [ORDER_STATUSES.PENDING_PAYMENT]: [ORDER_STATUSES.PAID, ORDER_STATUSES.CANCELLED, ORDER_STATUSES.EXPIRED, ORDER_STATUSES.PAYMENT_FAILED],
        [ORDER_STATUSES.PENDING_VALIDATION]: [ORDER_STATUSES.PAID, ORDER_STATUSES.PAYMENT_REJECTED],
        [ORDER_STATUSES.PAID]: [ORDER_STATUSES.SHIPPED],
        [ORDER_STATUSES.PAYMENT_REJECTED]: [],
        [ORDER_STATUSES.SHIPPED]: [],
        [ORDER_STATUSES.CANCELLED]: [],
        [ORDER_STATUSES.EXPIRED]: [],
        [ORDER_STATUSES.PAYMENT_FAILED]: []
    }

    canTransitionTo(newStatus) {
        if (this.order.payment_method === PAYMENT_METHODS.BANK_TRANSFER &&
            this.order.status === ORDER_STATUSES.PENDING_PAYMENT &&
            newStatus === ORDER_STATUSES.PAID) {
            return false
        }
        return OrderStateMachine.validTransitions[this.order.status]?.includes(newStatus) ?? false;
    }
}
