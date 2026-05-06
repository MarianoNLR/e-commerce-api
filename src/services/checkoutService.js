import { getPaymentStrategy } from './payments/paymentRegistry.js'

export async function createPayment({ userId, shippingInfo, paymentMethod, orderId }) {
  const strategy = getPaymentStrategy(paymentMethod)
  return strategy.createPayment({ userId, shippingInfo, orderId })
}

export async function receiveWebhook({ provider, paymentInfo }) {
  const strategy = getPaymentStrategy(provider)
  return strategy.handleWebhook({ paymentInfo })
}