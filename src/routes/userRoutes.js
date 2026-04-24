import express from 'express'
import { getAllUsers, getMe, getUserById } from '../controllers/userController.js'
import { authUser } from '../middlewares/authUser.js'
import User from '../models/User.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { BadRequestError } from '../errors/BadRequestError.js'

const userRouter = express.Router()

// userRouter.post('/register', register)
// userRouter.post('/complete-google-signup', completeGoogleSignup)
// userRouter.post('/login', login)
// userRouter.get('/google', 
//     (req, res, next) => {
//         passport.authenticate('google', {
//             scope: ['profile', 'email'], 
//             state: req.query.state || "default" 
//         })(req, res, next)
//     }
// )
// userRouter.get('/google/callback', passport.authenticate('google', { session: false }), loginUserFromGoogle)
// userRouter.post('/logout', logout)
userRouter.get('/me', authUser, getMe)
userRouter.get('/:id', getUserById)
userRouter.post('/email-check', async (req, res, next) => {
    try {
        console.log(req.body)
        const { email } = req.body
        if (!email) {
            return next(new BadRequestError('Email is required'))
        }
        // Check if the email exists in the database
        const user = await User.findOne({ email })
        if (user) {
            return sendSuccess(res, { email: user.email }, 200)
        }
        return sendSuccess(res, { email: null }, 200)
    } catch (error) {
        return next(error)
    }
})
userRouter.get('/', getAllUsers)


export default userRouter
