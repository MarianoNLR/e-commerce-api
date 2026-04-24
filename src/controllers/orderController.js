import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import * as orderService from '../services/orderService.js'
import { accessibleBy } from '@casl/mongoose'
import { sendSuccess } from '../utils/apiResponse.js'
import { NotFoundError } from '../errors/NotFoundError.js'

export async function getOrders (req, res, next) {
  try {
    const filter = accessibleBy(req.ability, 'read').ofType('Order')
    console.log('FILTER IN GET ORDERS: ', filter)
    const result = await orderService.getOrders({
      filter,
      page: Math.max(parseInt(req.query.page) || 1, 1),
      limit: Math.min(parseInt(req.query.limit) || 5, 50)
    })
    return sendSuccess(res, result, 200)
  }
 
  catch (error) {
    console.error('Failed to fetch orders:', error)
    next(error)
  }
}

export async function getOrderById (req, res, next) {
  const { orderId } = req.params
  const filter = accessibleBy(req.ability, 'read').ofType('Order')
  try {
    const order = await orderService.getOrderById(orderId, filter)
    if (!order) {
      return next(new NotFoundError('Order not found.'))
    }
    return sendSuccess(res, order, 200)
  } catch (error) {
    console.error('Failed to get order by ID:', error)
    next(error)
  }
}

export async function updateOrderStatus (req, res, next) {
  const { orderId } = req.params
  const { status } = req.body
  try {
    const filter = accessibleBy(req.ability, 'update').ofType('Order')
    const result = await orderService.updateOrderStatus({ orderId, status, filter })
    
    return sendSuccess(res, { order: result }, 200)
  } catch (error) {
    console.error('Failed to update order status:', error)
    next(error)
  }
}

// export async function payWithMercadoPago (req, res, next) {
//   const { orderId } = req.params
//   const { status, payment_id: paymentId } = req.body
//   console.log('UPDATE ORDER STATUS REQ.BODY: ', req.body)
//   console.log('ORDER ID: ', orderId)
//   try {
//     //const order = await Order.findByIdAndUpdate(orderId, { status, payment_id: paymentId }, { new: true })
//     const order = await orderService.payWithMercadoPago({ orderId, status, paymentId })
//     // for (let i = 0; i < order.items.length; i++) {
//     //   console.log(order.items[i].productId, order.items[i].quantity)
//     //   if (!await updateProductStockPurchase(order.items[i].productId, order.items[i].quantity)) {
//     //     console.error('Error updating product stock.')
//     //     return
//     //   }
//     // }
//     return order
//   } catch (error) {
//     // res.status(500).json({ error: 'Failed to update order status.' })
//     console.error('Failed to update order status:', error)
//     next(error)
//   }
// }

export async function updateOrder (req, res, next) {
  const { orderId } = req.params
  const updateData = req.body
  try {
    //const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true })
    const order = await orderService.updateOrder(orderId, updateData)
    return sendSuccess(res, { order }, 200)
  } catch (error) {
    console.error('Failed to update order:', error)
    next(error)
  }
}

export async function createOrder (req, res, next) {
  try {
    const { shipping_info: shippingInfo } = req.body
    console.log('SHIPPING INFO IN CREATE ORDER: ', shippingInfo)
    const newOrder = await orderService.createOrder({ userId: req.user._id, shippingInfo })
    console.log("NEW ORDER: ", newOrder)
    return sendSuccess(res, newOrder, 201)
  } catch (error) {
    console.error('An error has ocurred while creating order.', error)
    next(error)
  }
}
