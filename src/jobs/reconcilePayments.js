import Order from '../models/Order.js'
import { ORDER_STATUSES } from '../lib/orderStatuses.js'
import { PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { getPaymentStrategy } from '../services/payments/paymentRegistry.js'

export function startReconciliationPayments() {
    setInterval(async () => {
        try {
            await reconcilePayments()
        } catch (error) {
            console.error('Error reconciling payments:', error)
        }
    }, 5 * 60 * 1000)
}

export async function reconcilePayments() {
    const pendingOrders = await Order.find({
        status: ORDER_STATUSES.PENDING_PAYMENT,
        payment_method: PAYMENT_METHODS.MERCADO_PAGO,
        payment_id: { $exists: true, $ne: null }
    }).limit(50)

    for (const order of pendingOrders) {
        try {
            // Reuse webhook validation and transitions so retries share the same rules.
            await getPaymentStrategy(PAYMENT_METHODS.MERCADO_PAGO).processPayment({
                paymentId: order.payment_id, expectedOrderId: order._id
            })
        } catch (error) {
            console.error(`Error reconciling payment for order ${order._id}:`, error)
        }
    }
}
