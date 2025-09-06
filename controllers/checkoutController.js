import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { updateProductStockPurchase } from './productController.js'
const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

const payment = new Payment(client)

export async function setPreferences (req, res) {
  const { userId } = req
  const [cart] = await Cart.find({ user: userId }).populate('items.product')
  const preference = new Preference(client)
  const items = []

  if (!cart) return res.status(404).json({ error: 'Cart not found.' })

  console.log(cart.items[0].product)
  for (let i = 0; i < cart.items.length; i++) {
    const productData = cart.items[i].product
    items.push({
      title: productData.name,
      quantity: cart.items[i].quantity,
      unit_price: productData.price
    })
  }
  try {
    const result = await preference.create({
      body: {
        items,
        back_urls: {
          success: 'https://google.com',
          failure: 'https://google.com',
          pending: 'https://google.com'
        },
        auto_return: 'all',
        notification_url: 'https://1378c1186f4c.ngrok-free.app/checkout/webhook',
        external_reference: userId
      }
    })
    console.log('PREFERENCES: ', result)
    return res.status(200).json({ result })
  } catch (error) {
    console.error(error)
  }
}

export const receiveWebhook = async (req, res) => {
  const paymentInfo = req.query
  try {
    if (paymentInfo.type === 'payment') {
      const paymentData = await payment.get({
        id: paymentInfo['data.id']
      })
      await createOrder(req, res, paymentData)

      return res.sendStatus(200)
    }
  } catch (error) {
    return res.status(500).json({ error })
  }
}

const createOrder = async (req, res, paymentInfo) => {
  try {
    const [cartUser] = await Cart.find({ user: paymentInfo.external_reference }).populate('items.product')
    if (!cartUser) {
      console.error('Cart not found.')
      return
    }
    console.log(cartUser)
    for (let i = 0; i < cartUser.items.length; i++) {
      console.log(cartUser.items[i].product.id, cartUser.items[i].quantity)
      if (!await updateProductStockPurchase(cartUser.items[i].product.id, cartUser.items[i].quantity)) {
        console.error('Error updating product stock.')
        return
      }
    }
    const newOrder = await Order.create({
      user: paymentInfo.external_reference,
      products: cartUser.items,
      total: cartUser.totalPrice,
      payment_id: paymentInfo.id
    })

    await Cart.findOneAndDelete({ user: paymentInfo.external_reference })
  } catch (error) {
    console.error('An error has ocurred while creating order.', error)
  }
}
