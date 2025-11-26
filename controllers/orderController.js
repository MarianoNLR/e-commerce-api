import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import { updateProductStockPurchase } from './productController.js'

export async function getOrders (req, res) {
  try {
    const page = parseInt(req.query.page) || 0
    const limit = 5
    const skip = page * limit

    const orders = await Order.find()
      .populate('user', '-password')
      .populate('products.product')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    const totalOrders = await Order.countDocuments()
    const hasMore = skip + orders.length < totalOrders

    res.status(200).json({
      orders,
      hasMore,
      currentPage: page,
      totalOrders
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' })
  }
}

export async function getOrderById (req, res) {
  const { orderId } = req.params
  try {
    const order = await Order.findById(orderId).populate('user', '-password').populate('products.product')
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }
    res.status(200).json(order)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order.' })
  }
}

export async function updateOrderStatus (req, res) {
  const { orderId } = req.params
  const { status } = req.body
  console.log('UPDATE ORDER STATUS REQ.BODY: ', req.body)
  console.log('ORDER ID: ', orderId)
  try {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true })
    if (!order) {
      return null
    }
    return res.status(200).json(order)
  } catch (error) {
    // res.status(500).json({ error: 'Failed to update order status.' })
    console.log('Failed to update order status.', error)
    return null
  }
}

export async function payWithMercadoPago (req, res) {
  const { orderId } = req.params
  const { status, payment_id: paymentId } = req.body
  console.log('UPDATE ORDER STATUS REQ.BODY: ', req.body)
  console.log('ORDER ID: ', orderId)
  try {
    const order = await Order.findByIdAndUpdate(orderId, { status, payment_id: paymentId }, { new: true })
    .populate('products.product')
    for (let i = 0; i < order.products.length; i++) {
      console.log(order.products[i].product, order.products[i].quantity)
      if (!await updateProductStockPurchase(order.products[i].product, order.products[i].quantity)) {
        console.error('Error updating product stock.')
        return
      }
    }
    if (!order) {
      return null
    }
    return order
  } catch (error) {
    // res.status(500).json({ error: 'Failed to update order status.' })
    console.log('Failed to update order status.', error)
    return null
  }
}

export async function updateOrder (req, res) {
  const { orderId } = req.params
  const updateData = req.body
  try {
    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true })
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }
    res.status(200).json(order)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order.' })
  }
}

export async function createOrder (req, res) {
  try {
    const { shipping_info: shippingInfo } = req.body
    console.log('SHIPPING INFO IN CREATE ORDER: ', shippingInfo)
    const [cartUser] = await Cart.find({ user: req.userId }).populate('items.product')
    if (!cartUser) {
      console.error('Cart not found.')
      return
    }
    console.log(cartUser)
    // for (let i = 0; i < cartUser.items.length; i++) {
    //   console.log(cartUser.items[i].product.id, cartUser.items[i].quantity)
    //   if (!await updateProductStockPurchase(cartUser.items[i].product.id, cartUser.items[i].quantity)) {
    //     console.error('Error updating product stock.')
    //     return
    //   }
    // }
    const newOrder = await Order.create({
      user: req.userId,
      items: cartUser.items.map(item => ({
        productId: item.product._id,
        name: item.product.name,
        description: item.product.description,
        priceAtPurchase: item.product.price,
        quantity: item.quantity
      })),
      total: cartUser.totalPrice,
      shipping_info: shippingInfo
    })

    await Cart.findOneAndDelete({ user: req.userId })
    // Just returning the new order and not a response because it's used internally
    return newOrder
    // return res.status(201).json(newOrder)
  } catch (error) {
    console.error('An error has ocurred while creating order.', error)
  }
}
