import jwt, { decode } from 'jsonwebtoken'
import { parse } from 'cookie'

const { JWT_SECRET } = process.env

export const authUser = (req, res, next) => {
  const authorization = req.get('authorization')
  let token = ''
  if (authorization && authorization.toLowerCase().startsWith('bearer')) {
    token = authorization.substring(7)
  }
  const decodedToken = jwt.verify(token, JWT_SECRET)

  if (!token || !decodedToken.userId) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }

  const { userId } = decodedToken
  req.userId = userId
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
