import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import * as orderService from '../../orderService.js'
import { AppError } from '../../../errors/AppError.js'
import dotenv from 'dotenv'
import { ORDER_STATUSES } from '../../../lib/orderStatuses.js'
import { PAYMENT_METHODS } from '../../../lib/paymentMethods.js'
import { BadRequestError } from '../../../errors/BadRequestError.js'
import { recordExpiredPayment } from '../../paymentIncidentService.js'
import Order from '../../../models/Order.js'

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`
})

export const MP_STATUS_MAP = Object.freeze({
  approved: ORDER_STATUSES.PAID,
  pending: ORDER_STATUSES.PENDING_PAYMENT,
  authorized: ORDER_STATUSES.PENDING_PAYMENT,
  rejected: ORDER_STATUSES.PAYMENT_FAILED,
  in_process: ORDER_STATUSES.PENDING_PAYMENT,
  cancelled: ORDER_STATUSES.CANCELLED
})
// Ver que siga funcionando
// Desde el front enviar el metodo de pago para que se ejecute el createPayment de este strategy.
export function createMercadoPagoStrategy({ accessToken }) {
  const client = new MercadoPagoConfig({ accessToken })
  const payment = new Payment(client)
  const preference = new Preference(client)

  async function createPayment({ order }) {
    if (order.payment_preference_id) {
      return { id: order.payment_preference_id }
    }

    console.log('ORDER IN CREATE PAYMENT MERCADOPAGO STRATEGY: ', order)
    const items = order.items.map(item => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: item.priceAtPurchase
    }))

    const paymentPreference = await preference.create({
      body: {
        items,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout/payment-result`,
          failure: `${process.env.FRONTEND_URL}/checkout/payment-result`,
          pending: `${process.env.FRONTEND_URL}/checkout/payment-result`
        },
        auto_return: 'all',
        notification_url: `${process.env.BASE_URL}/checkout/webhook/mercadopago`,
        external_reference: order._id,
        expires: true,
        expiration_date_from: new Date(),
        expiration_date_to: order.expires_at
      }
    })

    await orderService.savePaymentPreference({
      orderId: order._id,
      preferenceId: paymentPreference.id
    })

    return paymentPreference
  }

    async function handleWebhook({ paymentInfo }) {
      console.log('Handling MercadoPago webhook with info:', paymentInfo)
        const eventType = paymentInfo.type || paymentInfo.topic
        if (eventType !== 'payment') return

        const paymentId = paymentInfo['data.id'] || paymentInfo.id
        return processPayment({ paymentId })
    }

    async function processPayment({ paymentId, expectedOrderId }) {
        const paymentData = await payment.get({ id: paymentId })

        if (!paymentData || !paymentData.id || String(paymentData.id) !== String(paymentId)) {
            throw new AppError('Payment not found or payment ID mismatch.', 400)
        }

        const { status, transaction_amount, id } = paymentData
        const externalReference = paymentData.external_reference

        // Jobs must not process a payment that points to a different order.
        if (expectedOrderId && String(externalReference) !== String(expectedOrderId)) {
            throw new AppError('Payment order reference mismatch.', 400)
        }

        const order = await orderService.getOrderById(externalReference)

        if (order.payment_method !== PAYMENT_METHODS.MERCADO_PAGO) {
            throw new AppError('Payment method does not match the order.', 400)
        }

        if (order.total !== transaction_amount) {
            throw new AppError('Payment amount mismatch.', 400)
        }

        const newStatusOrder = MP_STATUS_MAP[status]
        if (!newStatusOrder) {
            throw new AppError('Unknown payment status.', 400)
        }

        // Stock was already released: record the payment for review without reactivating the order.
        if (newStatusOrder === ORDER_STATUSES.PAID && order.status === ORDER_STATUSES.EXPIRED) {
            return recordExpiredPayment({ order, paymentId: id, amount: transaction_amount })
        }

        // Store a pending reference without overwriting another payment or a terminal order.
        if (order.status === ORDER_STATUSES.PENDING_PAYMENT && newStatusOrder === ORDER_STATUSES.PENDING_PAYMENT) {
            const updated = await Order.findOneAndUpdate(
                { _id: order._id, status: ORDER_STATUSES.PENDING_PAYMENT, $or: [{ payment_id: null }, { payment_id: String(id) }] },
                { $set: { payment_id: String(id) } },
                { new: true }
            )
            if (!updated) throw new AppError('Order changed or another payment is already associated.', 400)
            return updated
        }

        // A payment can change status; skip processing only if the order already reflects it.
        if (order.status === newStatusOrder) {
            if (newStatusOrder === ORDER_STATUSES.PAID && String(order.payment_id) !== String(id)) {
                throw new AppError('A different payment is already associated with this order.', 400)
            }
            return order
        }

        try {
            return await orderService.processPaymentStatusChange({ order, newStatus: newStatusOrder, paymentId: id })
        } catch (error) {
            // The order may have changed since the initial read, for example due to the expiration job.
            if (!(error instanceof BadRequestError) || newStatusOrder !== ORDER_STATUSES.PAID) throw error
            const currentOrder = await orderService.getOrderById(order._id)
            if (currentOrder.status === ORDER_STATUSES.EXPIRED) {
                return recordExpiredPayment({ order: currentOrder, paymentId: id, amount: transaction_amount })
            }
            // Another notification for the same payment may have confirmed the order first.
            if (currentOrder.status === ORDER_STATUSES.PAID && String(currentOrder.payment_id) === String(id)) return currentOrder
            throw error
        }
    }

    async function processApprovedPaymentForOrder({ orderId }) {
        // The webhook can be missed, so discover approved payments from the order reference.
        const result = await payment.search({
            options: { external_reference: String(orderId), status: 'approved', limit: 1 }
        })
        const paymentId = result?.results?.[0]?.id
        if (!paymentId) return null

        return await processPayment({ paymentId, expectedOrderId: orderId })
    }

  return {
    createPayment,
    handleWebhook,
    processPayment,
    processApprovedPaymentForOrder
  }
}
