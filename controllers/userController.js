import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'
import * as authService from '../services/authService.js'

const { JWT_SECRET } = process.env

export async function login (req, res) {
  const { email, password } = req.body

  try {
    const user = await authService.login({ email, password })

    if (!user) {
      return res.status(401).json({ message: 'Email or password incorrect.' })
    }
  }
  catch (error) {
    return res.status(500).json({ error })
  }
}

export const completeGoogleSignup = async (req, res) => {
  
  try {
    const { token, name, lastName } = req.body
    const result = await authService.completeGoogleSignup({ token, name, lastName })
    return res.status(result.status).json(result.payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to complete Google signup.' })
  }
}

export const loginUserFromGoogle = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  const  {googleId, email } = req.user

  const result = await authService.loginUserFromGoogle({ googleId, email })
  const html = `
      <script>
        window.opener.postMessage(
          ${JSON.stringify(result.payload)},
        'http://localhost:5173'
        );
        window.close();
      </script>
    `
  if (!res) {
    return res.status(500).json({ message: 'Internal server error' })
  }
  return res.status(result.status).send(html)

}

export async function register (req, res) {
  const { name, lastName, email, password, confirmPassword } = req.body

  try {
    const newUserToken = await authService.register({ name, lastName, email, password, confirmPassword })
    return res.status(201).json(newUserToken)
    
  } catch (error) {
    return res.status(error.status).json({ error: error.message })
  }
}

export async function logout (req, res) {
  res.clearCookie('access_token').json({ message: 'Logout successfully.' })
}

export async function getUserById (req, res) {
  const { userId } = req.params

  try {
    const { user } = await authService.getUserById({ userId })
    if (user) {
      return res.status(200).json({ user })
    }

  } catch (error) {
    return res.status(error.status).json({ error: error.message })
  }
}

export async function getMe (req, res) {
  const userId = req.userId
  try {
    const { user } = await authService.getMe({ userId })
    if (user) {
      return res.status(200).json({ user })
    }
  } catch (error) {
    return res.status(404).json({ error: 'User not found.' })
  }

}

export async function getAllUsers (req, res) {
  try {
    const { users } = await authService.getAllUsers()

    return res.status(200).json({ users })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve users.' })
  }
}
