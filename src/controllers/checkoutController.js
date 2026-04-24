import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import 'dotenv/config'
import * as checkoutService from '../services/checkoutService.js'
import * as orderService from '../services/orderService.js'
import Order from '../models/Order.js'
import { sendOrderEmail } from '../emailController/emailController.js'
import { sendSuccess } from '../utils/apiResponse.js'
const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

const payment = new Payment(client)

export async function setPreferences (req, res, next) {
  const { userId } = req
  const { shipping_info } = req.body
  try {
    const result = await checkoutService.setPreferences({userId, shipping_info })
    return sendSuccess(res, { result }, 200)
  } catch (error) {
    console.error(error)
    return next(error)
  }
}

export const receiveWebhook = async (req, res, next) => {
  console.log('WEBHOOK: ', req.query)
  const paymentInfo = req.query
  console.log('PAYMENT INFO: ', paymentInfo)
  try {
    const result = await checkoutService.receiveWebhook({ paymentInfo })
    if (result) {
      return sendSuccess(res, { result }, 201)
    }
  } catch (error) {
    return next(error)
  }
}
