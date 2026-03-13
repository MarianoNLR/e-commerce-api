import { Router } from 'express'
import { authUser } from '../middlewares/authUser.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { getOrders, getOrderById, updateOrderStatus, updateOrder, createOrder } from '../controllers/orderController.js'

const orderRouter = Router()

orderRouter.use(authUser, defineAbilityMiddleware)

orderRouter.get('/', checkAbility('read', 'Order'), getOrders)
orderRouter.get('/:orderId', checkAbility('read', 'Order'), getOrderById)

orderRouter.post('/', checkAbility('create', 'Order'), createOrder)

orderRouter.put('/:orderId/status', checkAbility('update', 'Order'), updateOrderStatus)
orderRouter.put('/:orderId', checkAbility('update', 'Order'), updateOrder)

export default orderRouter
