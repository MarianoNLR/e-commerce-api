import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'
const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

export async function setPreferences (req, res) {
  const { userId } = req
  const [cart] = await Cart.find({ user: userId }).populate('items.product')
  const preference = new Preference(client)
  const items = []

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
          success: 'http://localhost:5173/',
          failure: 'http://localhost:5173/',
          pending: 'http://localhost:5173/'
        },
        auto_return: 'all'
      }
    })
    console.log(result)
    return res.status(200).json({ result })
  } catch (error) {
    console.error(error)
  }
}
