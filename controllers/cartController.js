import Cart from '../models/Cart.js'
import 'dotenv/config'

export async function add (req, res) {
  // Create cart if it's first item
  const user = req.session.user
  const { productId, quantity } = req.body
  let userCart = await Cart.find({ user: user.userId })

  if (!userCart) {
    const newCart = new Cart({ user: user.userId, items: [], totalPrice: 0 })
    userCart = await newCart.save()
  }

  // Control if item already exists
  const itemExists = userCart.items.findIndex(item => item.product.toString() === productId)

  // If index is -1 item does not exist in cart
  if (itemExists === -1) {
    userCart.items.push({ product: productId, quantity })
  } else {
    // Change for new quantity
    userCart.items[itemExists].quantity = quantity
  }
  await userCart.save()
  // TODO UPDATE TOTAL PRICE

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
