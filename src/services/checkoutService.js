import { getPaymentStrategy } from './payments/paymentRegistry.js'
import * as orderService from './orderService.js'

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
