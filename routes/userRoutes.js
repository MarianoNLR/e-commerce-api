import express from 'express'
import { login, register, logout, getUser, getAllUsers } from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.post('/logout', logout)
userRouter.get('/:id', getUser)
userRouter.get('/', getAllUsers)

export default userRouter
