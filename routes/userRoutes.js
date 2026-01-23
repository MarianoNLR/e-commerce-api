import express from 'express'
import { getAllUsers, getMe, getUserById } from '../controllers/userController.js'
import { authUser } from '../middlewares/authUser.js'
import User from '../models/User.js'

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
userRouter.post('/email-check', async (req, res) => {
    console.log(req.body)
    const { email } = req.body
    if (!email) {
        return res.status(400).json({ message: 'Email is required' })
    }
    // Check if the email exists in the database
    const user = await User.findOne({ email })
    if (user) {
        return res.status(200).json({ email: user.email })
    }
    return res.status(200).json({ email: null })
})
userRouter.get('/', getAllUsers)


export default userRouter
