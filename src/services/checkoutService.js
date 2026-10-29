import { getPaymentStrategy } from './payments/paymentRegistry.js'
import * as orderService from './orderService.js'
import { PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { BadRequestError } from '../errors/BadRequestError.js'

export async function createPayment({ userId, paymentMethod, orderId }) {
  const order = await orderService.getOrderForPayment({ orderId, userId, paymentMethod })
  const strategy = getPaymentStrategy(paymentMethod)
  return strategy.createPayment({ order })
}

export async function receiveWebhook({ provider, paymentInfo }) {
  console.log('Processing webhook for provider:', provider)
  const strategy = getPaymentStrategy(provider)
  return strategy.handleWebhook({ paymentInfo })
}

/**
 * Verifies a payment when the buyer returns from the provider, without waiting for the webhook.
 *
 * The client only supplies the payment and order identifiers: the payment itself is fetched from
 * Mercado Pago and validated (amount, order reference) by the same code the webhook uses, so a
 * forged identifier cannot change an order. Repeated or concurrent calls are idempotent.
 */
export async function verifyPayment ({ userId, paymentId, orderId }) {
  if (!paymentId || !orderId) {
    throw new BadRequestError('payment_id and order_id are required.')
  }

  // Only the owner of the order can trigger its verification.
  const order = await orderService.getOrderById(orderId, { user: userId })
  if (order.payment_method !== PAYMENT_METHODS.MERCADO_PAGO) {
    throw new BadRequestError('Payment method does not match the order.')
  }

  const strategy = getPaymentStrategy(PAYMENT_METHODS.MERCADO_PAGO)
  await strategy.processPayment({ paymentId, expectedOrderId: orderId })

  // The strategy may return an incident record (late payment), so always answer with the order itself.
  const current = await orderService.getOrderById(orderId, { user: userId })
  return { id: current._id, status: current.status }
}
