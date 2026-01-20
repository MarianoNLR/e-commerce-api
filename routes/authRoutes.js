import { Router } from 'express';
import passport from 'passport';
import { register, login, loginUserFromGoogle, completeGoogleSignup, logout } from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.get('/google', 
    (req, res, next) => {
        passport.authenticate('google', {
            scope: ['profile', 'email'], 
            state: req.query.state || "default" 
        })(req, res, next)
    }
)
authRouter.post('/google/complete', completeGoogleSignup)
authRouter.get('/google/callback', passport.authenticate('google', { session: false }), loginUserFromGoogle)
authRouter.post('/logout', logout)



export default authRouter;