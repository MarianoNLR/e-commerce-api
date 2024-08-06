import jwt from 'jsonwebtoken'
import { parse } from 'cookie'

const { JWT_SECRET } = process.env

export const authUser = (req, res, next) => {
  if (!req.cookies || !req.cookies.access_token) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  const token = req.cookies.access_token

  req.session = { user: null }

  try {
    const data = jwt.verify(token, JWT_SECRET)
    req.session.user = data
  } catch (error) {
    return null
  }

  console.log(req.session.user)
  next()
}
