import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import 'dotenv/config'
import * as checkoutService from '../services/checkoutService.js'
// import Product from '../models/Product.js'
// import Order from '../models/Order.js'
// import { updateProductStockPurchase } from './productController.js'
//import { createOrder, updateOrderStatus, payWithMercadoPago } from './orderController.js'
import * as orderService from '../services/orderService.js'
import Order from '../models/Order.js'
import { sendOrderEmail } from '../emailController/emailController.js'
const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

const payment = new Payment(client)

export async function setPreferences (req, res) {
  const { userId } = req
  const { shipping_info } = req.body
  try {
    const result = await checkoutService.setPreferences({userId, shipping_info })
    return res.status(200).json({ result })
  } catch (error) {
    console.error(error)
  }
}

export const receiveWebhook = async (req, res) => {
  console.log('WEBHOOK: ', req.query)
  const paymentInfo = req.query
  console.log('PAYMENT INFO: ', paymentInfo)
  try {
    const result = await checkoutService.receiveWebhook({ paymentInfo })
    if (result) {
      return res.status(201).json({ result })  
    }
  } catch (error) {
    return res.status(500).json({ error })
  }
}

// const createOrder = async (req, res, paymentInfo) => {
//   try {
//     const [cartUser] = await Cart.find({ user: paymentInfo.external_reference }).populate('items.product')
//     if (!cartUser) {
//       console.error('Cart not found.')
//       return
//     }
//     console.log(cartUser)
//     for (let i = 0; i < cartUser.items.length; i++) {
//       console.log(cartUser.items[i].product.id, cartUser.items[i].quantity)
//       if (!await updateProductStockPurchase(cartUser.items[i].product.id, cartUser.items[i].quantity)) {
//         console.error('Error updating product stock.')
//         return
//       }
//     }
//     const newOrder = await Order.create({
//       user: paymentInfo.external_reference,
//       products: cartUser.items,
//       total: cartUser.totalPrice,
//       payment_id: paymentInfo.id
//     })

//     await Cart.findOneAndDelete({ user: paymentInfo.external_reference })
//   } catch (error) {
//     console.error('An error has ocurred while creating order.', error)
//   }
// }
