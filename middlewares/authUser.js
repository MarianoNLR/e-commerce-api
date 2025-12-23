import jwt, { decode } from 'jsonwebtoken'
import { parse } from 'cookie'
import User from '../models/User.js'
import 'dotenv/config'
import { verifyToken } from '../utils/verifyToken.js'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'
const { JWT_SECRET } = process.env

export const authUser = async (req, res, next) => {

  // Get token from Authorization header
  const authorization = req.get('authorization')

  // if authorization header is missing or doesn't start with 'Bearer ' throw error
  if (!authorization?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token missing or invalid.'))
  }

  // Get only the token part
  const token = authorization.substring(7)

  // Verify token and get decoded data
  const decodedToken = verifyToken(token)

  if (!decodedToken?.userId) {
    return next(new UnauthorizedError('Token missing or invalid.'))
  }
  
  // Set user info in request object
  const user = await User.findById(decodedToken.userId).select('-password')
  if (!user) {
    return next(new UnauthorizedError('User not found for token.'))
  }
  req.user = user
  req.userId = user._id
  next()

  // To use with cookies
  // if (!req.cookies || !req.cookies.access_token) {
  //   return res.status(401).json({ message: 'Not authenticated' })
  // }

  // const token = req.cookies.access_token

  // req.session = { user: null }

  // try {
  //   const data = jwt.verify(token, JWT_SECRET)
  //   req.session.user = data
  // } catch (error) {
  //   return null
  // }

  // console.log(req.session.user)
  // next()
}
