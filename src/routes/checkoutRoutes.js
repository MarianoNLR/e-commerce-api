import express from 'express'
import { receiveWebhook, createPayment, verifyPayment } from '../controllers/checkoutController.js'
import { authUser } from '../middlewares/authUser.js'

const checkoutRouter = express.Router()

checkoutRouter.post('/', authUser, createPayment)
checkoutRouter.post('/verify-payment', authUser, verifyPayment)
checkoutRouter.post('/webhook/:provider', receiveWebhook)

export default checkoutRouter
