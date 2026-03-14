import express from 'express'
import { add, getCart, deleteItem } from '../controllers/cartController.js'
import { authUser } from '../middlewares/authUser.js'
import { addCartSchema, deleteCartItemSchema } from '../validators/cartSchema.js'
import { validate } from '../middlewares/validate.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'

const cartRouter = express.Router()

cartRouter.use(authUser, defineAbilityMiddleware)

cartRouter.post('/', validate(addCartSchema), checkAbility('create', 'Cart'), add)

cartRouter.get('/', getCart)

cartRouter.patch('/item/:product', validate(deleteCartItemSchema), checkAbility('update', 'Cart'), deleteItem)

export default cartRouter
