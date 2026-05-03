import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../../../models/Cart.js'
import * as orderService from '../../orderService.js'
import { AppError } from '../../../errors/AppError.js'
import { NotFoundError } from '../../../errors/NotFoundError.js'

export const MP_STATUS_MAP = Object.freeze({
  approved: 'paid',
  pending: 'pending_payment',
  authorized: 'pending_payment',
  rejected: 'payment_failed',
  in_process: 'pending_payment',
  cancelled: 'cancelled'
})
// Ver que siga funcionando
// Desde el front enviar el metodo de pago para que se ejecute el createPayment de este strategy.
export function createMercadoPagoStrategy({ accessToken }) {
  const client = new MercadoPagoConfig({ accessToken })
  const payment = new Payment(client)
  const preference = new Preference(client)

  async function createPayment({ userId, shippingInfo }) {
    const [cart] = await Cart.find({ user: userId }).populate('items.product')
    if (!cart) throw new AppError('Cart not found for user.', 404)

    const items = cart.items.map(item => ({
      title: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price
    }))

    const { newOrder } = await orderService.createOrder({ userId, shippingInfo })

    return preference.create({
      body: {
        items,
        back_urls: {
          success: 'https://e-commerce-react-live.vercel.app/checkout/payment-result',
          failure: 'https://e-commerce-react-live.vercel.app/checkout/payment-result',
          pending: 'https://e-commerce-react-live.vercel.app/checkout/payment-result'
        },
        auto_return: 'all',
        notification_url: 'https://e-commerce-api-gpfg.onrender.com/api/v1/checkout/webhook/mercadopago',
        external_reference: newOrder._id,
        expires: true,
        expiration_date_from: new Date(),
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000)
      }
    })
  }

    async function handleWebhook({ paymentInfo }) {
        const eventType = paymentInfo.type || paymentInfo.topic
        if (eventType !== 'payment') return

        const paymentId = paymentInfo['data.id'] || paymentInfo.id
        const paymentData = await payment.get({ id: paymentId })

        const { status, transaction_amount, id } = paymentData
        const externalReference = paymentData.external_reference

        const order = await orderService.getOrderById(externalReference)
        if (!order) throw new NotFoundError('Order not found.')

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
