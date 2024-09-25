import express from 'express'
import { setPreferences } from '../controllers/checkoutController.js'
import { authUser } from '../middlewares/authUser.js'

const checkoutRouter = express.Router()

checkoutRouter.post('/', authUser, setPreferences)

export default checkoutRouter
