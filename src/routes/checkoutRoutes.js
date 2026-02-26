import express from 'express'
import { receiveWebhook, setPreferences } from '../controllers/checkoutController.js'
import { authUser } from '../middlewares/authUser.js'

const checkoutRouter = express.Router()

checkoutRouter.post('/', authUser, setPreferences)
checkoutRouter.post('/webhook', receiveWebhook)

export default checkoutRouter
