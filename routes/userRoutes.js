import express from 'express'
import { login, register, logout, getUser, getAllUsers, getMe } from '../controllers/userController.js'
import { authUser } from '../middlewares/authUser.js'

const userRouter = express.Router()

userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.post('/logout', logout)
userRouter.get('/me', authUser, getMe)
userRouter.get('/:id', getUser)
userRouter.get('/', getAllUsers)

export default userRouter
