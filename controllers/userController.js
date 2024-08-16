import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function login (req, res) {
  const { username, password } = req.body

  try {
    const user = await User.findOne({ username })

    if (!user) {
      return res.status(401).json({ message: 'Username or password incorrect.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Username or password incorrect.' })
    }

    const token = jwt.sign({ userId: user._id, username: user.username, password: user.password }, JWT_SECRET)

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None'
    })

    return res.status(200).json({ user, token })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function register (req, res) {
  const { username, password, confirmPassword } = req.body

  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords must match.' })

  try {
    const userExists = await User.findOne({ username })

    if (userExists) return res.status(400).json({ message: 'Username already exists.' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({ username, password: hashedPassword })

    await newUser.save()

    return res.json({ username, password: hashedPassword })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function logout (req, res) {
  res.clearCookie('access_token').json({ message: 'Logout successfully.' })
}

export async function getUser (req, res) {
  const { userId } = req.params

  try {
    const user = User.findById(userId)

    if (user) {
      return res.status(200).json({ user })
    }

    return res.status(404).json({ message: 'User not found.' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function getMe (req, res) {
  const { user } = req.session
  const response = await User.findById(user.userId)

  if (response) {
    return res.status(200).json({ user: response })
  }
  return res.status(401).json({ error: 'Not Authorized' })
}

export async function getAllUsers (req, res) {
  try {
    const users = await User.find({})

    return res.status(200).json({ users })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
