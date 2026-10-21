import Order from "../models/Order.js";
import { transitionOrderStatus } from "../services/orderService.js";
import { ORDER_STATUSES } from '../lib/orderStatuses.js'
import { PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { getPaymentStrategy } from '../services/payments/paymentRegistry.js'

export function startOrderExpiration() {
    setInterval(async () => {
        try {
            await expirePendingOrders()
        } catch (error) {
            console.error('Error expiring orders:', error)
        }
    }, 5 * 60 * 1000)
}

export async function expirePendingOrders() {
    const expiredOrders = await Order.find({
        status: ORDER_STATUSES.PENDING_PAYMENT,
        expires_at: { $lte: new Date() }
    }).select('_id payment_id payment_method')

    for (const order of expiredOrders) {
        try {
            if (order.payment_method === PAYMENT_METHODS.MERCADO_PAGO && order.payment_id) {
                // A failed or ambiguous provider lookup leaves the reservation in place for the next run.
                const current = await getPaymentStrategy(PAYMENT_METHODS.MERCADO_PAGO).processPayment({
                    paymentId: order.payment_id, expectedOrderId: order._id
                })
                if (current.status !== ORDER_STATUSES.PENDING_PAYMENT) continue
            }
            await transitionOrderStatus({
                orderId: order._id,
                newStatus: ORDER_STATUSES.EXPIRED,
                // A new reference must be checked on the next run before releasing stock.
                filter: { status: ORDER_STATUSES.PENDING_PAYMENT, payment_id: order.payment_id || null }
            })
        } catch (error) {
            // One malformed order or transient database failure must not keep
            // the rest of the expired queue from being processed.
            console.error(`Error expiring order ${order._id}:`, error)
        }
    }
}
