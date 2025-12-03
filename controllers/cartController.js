import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'
import * as cartService from '../services/cartService.js'

export async function add (req, res) {
  // Create cart if it's first item
  // const user = req.session.user
  const userId = req.userId
  const { productId, quantity } = req.body.data
  
  try {
    const result = await cartService.addItemToCart(userId, productId, quantity)
    return res.status(200).json({ cart: result })
  } catch (error) {
    console.error(error)
    return res.status(error.status || 500).json({error: error.message || 'Error adding item to cart' })
  }
}

export async function getCart (req, res) {
  // const user = req.session.user
  const { userId } = req.params
  try {
    const cart = await cartService.getCartByUserId(userId)
    return res.status(200).json({ cart })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error retrieving cart' })
  }
}

export async function deleteItem (req, res) {
  const userId = req.userId
  try {
    const { product: productId } = req.params
    const result = await cartService.deleteItemFromCart(userId, productId)
    //const [cart] = await Cart.find({ user: userId }).populate('items.product')
    
    return res.status(200).json({ cart: result })
  } catch (error) {
    console.error(error)
    return res.status(error.status || 500).json({error: error.message || 'Error deleting item from cart' })
  }
}
