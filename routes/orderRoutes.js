import { Router } from 'express'
import { authUser } from '../middlewares/authUser.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { getOrders, getOrderById, updateOrderStatus, updateOrder, createOrder } from '../controllers/orderController.js'

const orderRouter = Router()

orderRouter.get('/', authUser, defineAbilityMiddleware, checkAbility('read', 'Order'), getOrders)
orderRouter.get('/:orderId', authUser, defineAbilityMiddleware, checkAbility('read', 'Order'), getOrderById)

orderRouter.post('/', authUser, defineAbilityMiddleware, checkAbility('create', 'Order'), createOrder)

orderRouter.put('/:orderId/status', authUser, defineAbilityMiddleware, checkAbility('update', 'Order'), updateOrderStatus)
orderRouter.put('/:orderId', authUser, defineAbilityMiddleware, checkAbility('update', 'Order'), updateOrder)

export default orderRouter
