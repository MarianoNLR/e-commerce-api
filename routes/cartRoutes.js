import express from 'express'
import { add, getCart } from '../controllers/cartController.js'
import { authUser } from '../middlewares/authUser.js'

const cartRouter = express.Router()

cartRouter.post('/', authUser, add)
cartRouter.get('/:userId', authUser, getCart)

export default cartRouter
