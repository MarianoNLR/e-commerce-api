import * as orderService from '../../orderService.js'
export function createBankTransferStrategy() {
  async function createPayment({ userId, shippingInfo }) {
    console.log('Creating bank transfer payment...')
    const { newOrder } = await orderService.createOrder({ userId, shippingInfo })

    return {
      orderId: newOrder._id,
      status: newOrder.status,
      paymentMethod: 'bank_transfer',
      preferenceId: null
    }
  }

  async function handleWebhook() {
    return
  }

  return {
    createPayment,
    handleWebhook
  }
}
