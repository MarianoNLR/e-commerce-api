import express from 'express'
import { receiveWebhook, createPayment } from '../controllers/checkoutController.js'
import { authUser } from '../middlewares/authUser.js'

const checkoutRouter = express.Router()

checkoutRouter.post('/', authUser, createPayment)
checkoutRouter.post('/webhook/:provider', receiveWebhook)

export default checkoutRouter
