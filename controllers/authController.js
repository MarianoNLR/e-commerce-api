import * as authService from '../services/authService.js'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import crypto from 'crypto'
import Session from '../models/Session.js'
import { verifyRefreshToken } from '../utils/verifyToken.js'

export async function login (req, res, next) {
  const { email, password } = req.body

  try {
    const {accessToken, refreshToken} = await authService.login({ email, password, userAgent: req.get('User-Agent'), ipAddress: req.ip })

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7*24*60*60*1000
    })
    return res.status(200).json(accessToken)
  }
  catch (error) {
    next(error)
  }
}

export async function refreshToken (req, res, next) {
  try {
    const { refresh_token } = req.cookies

    if (!refresh_token) {
      throw new UnauthorizedError('No refresh token provided.')
    }

    let payload
    payload = verifyRefreshToken(refresh_token)
      
    const hashRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex')

    const session = await Session.findOne({
      user: payload.userId,
      refreshToken: hashRefreshToken,
      revoked: false,
      expiresAt: { $gt: new Date() }
    })

    if (!session) {
      await Session.updateMany(
        { user: payload.userId},
        { revoked: true }
      )
      throw new UnauthorizedError('Refresh token revoked or expired.')
    }

    session.revoked = true
    await session.save()

    // Generate new tokens
    const newAccessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
    const newRefreshToken = jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10)

    // Create new session
    await Session.create({
      user: payload.userId,
      refreshToken: hashedNewRefreshToken,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + 7*24*60*60*1000)
    })

    // Set new refresh token in cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7*24*60*60*1000
    })

    res.json({ accessToken: newAccessToken })
  } catch (error) {
    next(error)
  }
  
}

export async function completeGoogleSignup (req, res, next) {
  
  try {
    const { token, name, lastName } = req.body
    const result = await authService.completeGoogleSignup({ token, name, lastName })
    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function loginUserFromGoogle (req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('No user data found from Google.'))
  }

  const  {googleId, email } = req.user

  const result = await authService.loginUserFromGoogle({ googleId, email })
  if (!result) {
    return next(new Error('Response object is undefined.'))
  }
  const html = `
      <script>
        window.opener.postMessage(
          ${JSON.stringify(result)},
        'http://localhost:5173'
        );
        window.close();
      </script>
    `

  return res.status(200).send(html)
}

export async function register (req, res, next) {
  const { name, lastName, email, password, confirmPassword } = req.body

  try {
    const newUserToken = await authService.register({ name, lastName, email, password, confirmPassword })
    return res.status(201).json(newUserToken)
    
  } catch (error) {
    return next(error)
  }
}

export async function logout (req, res, next) {
  res.clearCookie('access_token').json({ message: 'Logout successfully.' })
}