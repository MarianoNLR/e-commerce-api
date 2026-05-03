import { getPaymentStrategy } from './payments/paymentRegistry.js'

export async function createPayment({ userId, shippingInfo, paymentMethod }) {
  const strategy = getPaymentStrategy(paymentMethod)
  return strategy.createPayment({ userId, shippingInfo })
}

export async function receiveWebhook({ provider, paymentInfo }) {
  const strategy = getPaymentStrategy(provider)
  return strategy.handleWebhook({ paymentInfo })
}