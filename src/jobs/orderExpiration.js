import Order from "../models/Order.js";
import { transitionOrderStatus } from "../services/orderService.js";
import { ORDER_STATUSES } from '../lib/orderStatuses.js'

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
    }).select('_id')

    for (const order of expiredOrders) {
        try {
            await transitionOrderStatus({
                orderId: order._id,
                newStatus: ORDER_STATUSES.EXPIRED
            })
        } catch (error) {
            // One malformed order or transient database failure must not keep
            // the rest of the expired queue from being processed.
            console.error(`Error expiring order ${order._id}:`, error)
        }
    }
}
