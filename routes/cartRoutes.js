import express from 'express'
import { add, getCart, deleteItem } from '../controllers/cartController.js'
import { authUser } from '../middlewares/authUser.js'

const cartRouter = express.Router()

cartRouter.post('/', authUser, add)
cartRouter.get('/:userId', authUser, getCart)
cartRouter.patch('/item/:product', authUser, deleteItem)

export default cartRouter
