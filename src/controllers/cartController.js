import Cart from '../models/Cart.js'
import 'dotenv/config'
import Product from '../models/Product.js'
import * as cartService from '../services/cartService.js'
import { subject } from '@casl/ability'
import { sendSuccess } from '../utils/apiResponse.js'

export async function add (req, res, next) {
  // Create cart if it's first item
  // const user = req.session.user
  const userId = req.userId
  const { productId, quantity } = req.body
  
  try {
    const result = await cartService.addItemToCart(userId, productId, quantity)
    return sendSuccess(res, { cart: result }, 200)
  } catch (error) {
    console.error(error)
    next(error)
  }
}

export async function getCart (req, res, next) {
  const userId  = req.userId
  try {
    const cart = await cartService.getCartByUserId(userId)
    return sendSuccess(res, cart, 200)
  } catch (error) {
    console.error(error)
    next(error)
  }
}

export async function deleteItem (req, res, next) {
  const userId = req.userId
  try {
    const { product: productId } = req.params
    const result = await cartService.deleteItemFromCart(userId, productId)
    //const [cart] = await Cart.find({ user: userId }).populate('items.product')
    
    return sendSuccess(res, { cart: result }, 200)
  } catch (error) {
    console.error(error)
    next(error)
  }
}
