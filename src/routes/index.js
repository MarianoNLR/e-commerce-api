import { Router } from 'express'
import authRouter from './authRoutes.js'
import userRouter from './userRoutes.js'
import productRouter from './productRoutes.js'
import cartRouter from './cartRoutes.js'
import categoryRouter from './categoryRoutes.js'
import checkoutRouter from './checkoutRoutes.js'
import orderRouter from './orderRoutes.js'

const v1Router = Router()

v1Router.use('/auth', authRouter)
v1Router.use('/users', userRouter)
v1Router.use('/products', productRouter)
v1Router.use('/cart', cartRouter)
v1Router.use('/category', categoryRouter)
v1Router.use('/checkout', checkoutRouter)
v1Router.use('/orders', orderRouter)

export default v1Router