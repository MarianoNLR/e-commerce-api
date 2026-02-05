import express from 'express'
import { add, getCart, deleteItem } from '../controllers/cartController.js'
import { authUser } from '../middlewares/authUser.js'
import { addCartSchema, deleteCartItemSchema } from '../validators/cart.schema.js'
import { validate } from '../middlewares/validate.js'

const cartRouter = express.Router()

cartRouter.post('/', validate(addCartSchema), authUser, add)
cartRouter.get('/:userId', authUser, getCart)
cartRouter.patch('/item/:product', authUser, validate(deleteCartItemSchema), deleteItem)

export default cartRouter
