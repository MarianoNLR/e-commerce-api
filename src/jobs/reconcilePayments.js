import Order from '../models/Order.js'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import * as orderService from './orderService.js'
import { MP_STATUS_MAP } from './checkoutService.js'
import 'dotenv/config'

const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

const payment = new Payment(client)

async function reconcilePayments () {
    // Get all orders with pending payment status
    const pendingOrders = await Order.find({ status: 'pending_payment' }).limit(50)

    for (const order of pendingOrders) {
        try {
            const paymentRef = order.payment_id
            if (!paymentRef) {
                console.warn(`Order ${order._id} has pending payment but no payment reference.`)
                continue
            }

            const paymentData = await payment.get({ id: paymentRef })
            if (!paymentData) {
                console.warn(`Payment with ID ${paymentRef} not found for order ${order._id}.`)
                continue
            }

            const newStatus = MP_STATUS_MAP[paymentData.status]
            if (!newStatus) {
                console.warn(`Unrecognized payment status '${paymentData.status}' for order ${order._id}.`)
                continue
            }

            if (order.status === newStatus || newStatus === 'pending_payment') {
                continue
            }

            await orderService.processPaymentStatusChange({ order, newStatus, paymentId: paymentRef, userId: order.user })
        } catch (error) {
            console.error(`Error processing payment for order ${order._id}:`, error)
        }
    }
}