import Order from "../models/Order.js";
import { transitionOrderStatus } from "../services/orderService.js";
import { ORDER_STATUSES } from '../lib/orderStatuses.js'
import { PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { getPaymentStrategy } from '../services/payments/paymentRegistry.js'

// A provider outage should delay expiration briefly, but never reserve stock forever.
const PROVIDER_CHECK_GRACE_MS = Number(process.env.ORDER_EXPIRATION_PROVIDER_GRACE_MS) || 15 * 60 * 1000

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
    }).select('_id payment_id payment_method expires_at')

    for (const order of expiredOrders) {
        try {
            if (order.payment_method === PAYMENT_METHODS.MERCADO_PAGO) {
                try {
                    const strategy = getPaymentStrategy(PAYMENT_METHODS.MERCADO_PAGO)
                    const current = order.payment_id
                        ? await strategy.processPayment({ paymentId: order.payment_id, expectedOrderId: order._id })
                        : await strategy.processApprovedPaymentForOrder({ orderId: order._id })
                    if (current && current.status !== ORDER_STATUSES.PENDING_PAYMENT) continue
                } catch (error) {
                    const graceEndsAt = new Date(order.expires_at.getTime() + PROVIDER_CHECK_GRACE_MS)
                    if (new Date() < graceEndsAt) {
                        // Keep the reservation while retries can still verify the payment safely.
                        console.error(`Could not verify payment for order ${order._id}; retrying before ${graceEndsAt.toISOString()}:`, error)
                        continue
                    }
                    // The grace period is over: release stock and rely on a later webhook to create an incident.
                    console.error(`Could not verify payment for order ${order._id} before the grace period ended:`, error)
                }
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
