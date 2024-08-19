import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'

export async function add (req, res) {
  // Create cart if it's first item
  // const user = req.session.user
  const userId = req.userId
  const { productId, quantity } = req.body.data
  let [userCart] = await Cart.find({ user: userId })

  if (!userCart) {
    const newCart = new Cart({ user: userId, items: [], totalPrice: 0 })
    userCart = await newCart.save()
    console.log('Crea un carrito nuevo')
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
  let newTotalPrice = 0
  for (let i = 0; i < userCart.items.length; i++) {
    const item = await Product.findById(userCart.items[i].product)
    newTotalPrice += item.price * userCart.items[i].quantity
  }

  userCart.totalPrice = newTotalPrice
  await userCart.save()

  return res.status(201).json({ userCart })
}

export async function getCart (req, res) {
  // const user = req.session.user
  const { userId } = req.params
  const [cart] = await Cart.find({ user: userId }).populate('items.product')
  console.log('cart: ', cart)
  return res.status(200).json({ cart })
}

export async function deleteItem (req, res) {
  const userId = req.userId
  try {
    const { product: productId } = req.params

    const [cart] = await Cart.find({ user: userId }).populate('items.product')
    let totalPrice = cart.totalPrice
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i]
      if (item.product.id === productId) {
        console.log(item.product.price, item.quantity)
        totalPrice -= item.product.price * item.quantity
        cart.items.splice(i, 1)
        break
      }
    }
    console.log(cart.items)
    cart.totalPrice = totalPrice
    const afterUpdate = await Cart.findOneAndUpdate({ user: userId }, { items: cart.items, totalPrice }, {
      new: true
    })

    return res.status(200).json({ cart: afterUpdate })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
