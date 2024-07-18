import express from 'express'
import { add, getCart } from '../controllers/cartController.js'

const cartRouter = express.Router()

cartRouter.post('/', add)
cartRouter.get('/:id', getCart)

export default cartRouter
