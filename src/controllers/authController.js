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
      sameSite: 'none',
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
    const { refreshToken: currentRefreshToken } = req.cookies
    const { accessToken, refreshToken } = await authService.refreshToken(currentRefreshToken, req.get('User-Agent'), req.ip)
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7*24*60*60*1000
    })

    res.json({ accessToken })

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
  await authService.logout(req.cookies.refresh_token)
  res.clearCookie('refresh_token').json({ message: 'Logout successfully.' })
}