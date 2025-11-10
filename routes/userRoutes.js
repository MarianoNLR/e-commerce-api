import express from 'express'
import { login, loginUserFromGoogle, register, logout, getUser, getAllUsers, getMe } from '../controllers/userController.js'
import { authUser } from '../middlewares/authUser.js'
import passport from 'passport'

const userRouter = express.Router()

userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
userRouter.get('/google/callback', passport.authenticate('google', { session: false }), loginUserFromGoogle)
userRouter.post('/logout', logout)
userRouter.get('/me', authUser, getMe)
userRouter.get('/:id', getUser)
userRouter.get('/', getAllUsers)

export default userRouter
