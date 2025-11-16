import jwt, { decode } from 'jsonwebtoken'
import { parse } from 'cookie'
import User from '../models/User.js'
const { JWT_SECRET } = process.env

export const authUser = async (req, res, next) => {
  console.log(req.get('authorization'))
  const authorization = req.get('authorization')
  let token = ''
  if (authorization && authorization.toLowerCase().startsWith('bearer')) {
    console.log('Authenticating user...')
    token = authorization.substring(7)
  } else {
    return res.status(401).json({ error: 'token missing or invalid' })
  }
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET)
    console.log('Decoded token:', decodedToken)

    if (!token || !decodedToken.userId) {
      return res.status(401).json({ error: 'token missing or invalid' })
    }

    const { userId } = decodedToken
    req.userId = userId
    req.user = await User.findById(userId).select('-password')
  next()
  } catch (error) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }
  

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
