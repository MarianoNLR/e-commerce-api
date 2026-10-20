import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import * as orderService from '../../orderService.js'
import { AppError } from '../../../errors/AppError.js'
import dotenv from 'dotenv'
import { ORDER_STATUSES } from '../../../lib/orderStatuses.js'

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
        const paymentData = await payment.get({ id: paymentId })

        const { status, transaction_amount, id } = paymentData
        const externalReference = paymentData.external_reference

        const order = await orderService.getOrderById(externalReference)

        if (order.payment_id === id) return order

        if (order.total !== transaction_amount) {
            throw new AppError('Payment amount mismatch.', 400)
        }

        const newStatusOrder = MP_STATUS_MAP[status]
        if (!newStatusOrder) {
            throw new AppError('Unknown payment status.', 400)
        }

        if (order.status === newStatusOrder) return order

        return orderService.processPaymentStatusChange({
            order,
            newStatus: newStatusOrder,
            paymentId: id,
            userId: order.user
        })
    }

  return {
    createPayment,
    handleWebhook
  }
}
