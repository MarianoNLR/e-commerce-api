export function createBankTransferStrategy() {
  async function createPayment({ order }) {
    return {
      orderId: order._id,
      status: order.status,
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
