import * as checkoutService from '../services/checkoutService.js'
import { sendSuccess } from '../utils/apiResponse.js'

export async function createPayment(req, res, next) {
  const { userId } = req
  const { shipping_info, payment_method } = req.body
  try {
    const result = await checkoutService.createPayment({
      userId,
      shippingInfo: shipping_info,
      paymentMethod: payment_method
    })
    return sendSuccess(res, { result }, 200)
  } catch (error) {
    console.error(error)
    return next(error)
  }
}

export const receiveWebhook = async (req, res, next) => {
  const paymentInfo = req.query
  const { provider } = req.params
  try {
    const result = await checkoutService.receiveWebhook({ provider, paymentInfo })
    if (result) {
      return sendSuccess(res, { result }, 201)
    }
  } catch (error) {
    return next(error)
  }
}
