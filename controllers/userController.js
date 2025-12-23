import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'
import * as authService from '../services/authService.js'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

const { JWT_SECRET } = process.env

export async function login (req, res, next) {
  const { email, password } = req.body

  try {
    const user = await authService.login({ email, password })
    return res.status(200).json({ token: user })
  }
  catch (error) {
    next(error)
  }
}

export async function completeGoogleSignup (req, res, next) {
  
  try {
    const { token, name, lastName } = req.body
    const result = await authService.completeGoogleSignup({ token, name, lastName })
    return res.status(200).json(result)
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

export async function getUserById (req, res, next) {
  const { userId } = req.params

  try {
    const { user } = await authService.getUserById({ userId })
    if (user) {
      return res.status(200).json({ user })
    }

  } catch (error) {
    next(error)
  }
}

export async function getMe (req, res, next) {
  const userId = req.userId
  try {
    const { user } = await authService.getMe({ userId })
    if (user) {
      return res.status(200).json({ user })
    }
  } catch (error) {
    next(error)
  }

}

export async function getAllUsers (req, res, next) {
  try {
    const { users } = await authService.getAllUsers()

    return res.status(200).json({ users })
  } catch (error) {
    next(error)
  }
}
