import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'

export async function add (req, res) {
  // Create cart if it's first item
  const user = req.session.user
  const { productId, quantity } = req.body.data
  let [userCart] = await Cart.find({ user: user.userId })

  if (!userCart) {
    const newCart = new Cart({ user: user.userId, items: [], totalPrice: 0 })
    userCart = await newCart.save()
    console.log('Crea un carrito nuevo')
  }
  console.log(userCart)
  // Control if item already exists
  const itemExists = userCart.items.findIndex(item => item.product.toString() === productId)

  // If index is -1 item does not exist in cart
  if (itemExists === -1) {
    userCart.items.push({ product: productId, quantity: 1 })
  } else {
    // Change for new quantity
    userCart.items[itemExists].quantity = quantity
  }
  let newTotalPrice = 0
  for (let i = 0; i < userCart.items.length; i++) {
    const item = await Product.findById(userCart.items[i].product)
    newTotalPrice += item.price
  }

  userCart.totalPrice = newTotalPrice
  await userCart.save()

  return res.status(201).json({ userCart })
}

export async function getCart (req, res) {
  const user = req.session.user
  const cart = await Cart.find({ user: user.userId })

  return res.status(200).json({ cart })
}

export async function deleteItem (req, res) {
  // TODO
}
