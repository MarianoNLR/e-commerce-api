import express from 'express'
import {login, register, logout, getUser, getAllUsers} from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/', getAllUsers)
userRouter.get('/:id', getUser)
userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.post('/logout', logout)



export default userRouter