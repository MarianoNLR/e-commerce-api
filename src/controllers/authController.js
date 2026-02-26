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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
    try {
      payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_TOKEN_SECRET)
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN')
    }
    
      
    const hashRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex')

    const consumedSession = await Session.findOneAndUpdate(
      {
        user: payload.userId,
        refreshToken: hashRefreshToken,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      },
      { revokedAt: new Date() },

      { new: true }
    )

    if (!consumedSession) {
      // Check if the token was already revoked (possible reuse)
      const existingSession = await Session.findOne({
        user: payload.userId,
        refreshToken: hashRefreshToken
      })

      if (!existingSession) {
        throw new UnauthorizedError('Refresh token not found. Please log in again.', 'REFRESH_TOKEN_NOT_FOUND')
      }

      if (existingSession.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED')
      }

      if (existingSession.revokedAt) {
        const diff = Date.now() - existingSession.revokedAt.getTime() 
        // Race condition: If the token was revoked very recently, it might be the same request trying to refresh again before the first one finishes.
        if (diff < 2000) {
          throw new UnauthorizedError('Token already rotated.', 'REFRESH_TOKEN_ALREADY_ROTATED')
        } else {
          // Revoke all sessions for the user because of possible token reuse
          await Session.updateMany(
            { user: payload.userId },
            { revokedAt: new Date() }
          )
          throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked.', 'REFRESH_TOKEN_REUSE')
        }
      }

      throw new UnauthorizedError('Refresh token already used.', 'REFRESH_TOKEN_ALREADY_USED')
    }

    // Generate new tokens
    const newAccessToken = jwt.sign({ userId: payload.userId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn: '5s' })
    const newRefreshToken = jwt.sign({ userId: payload.userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    const hashedNewRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
  
  await Session.deleteOne({ refreshToken: req.cookies.refresh_token })
  res.clearCookie('refresh_token').json({ message: 'Logout successfully.' })
}