import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function login (req, res) {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Email or password incorrect.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email or password incorrect.' })
    }
    const token = jwt.sign({ userId: user._id}, JWT_SECRET)

    // res.cookie('access_token', token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'None'
    // })

    return res.status(200).json({ token })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export const completeGoogleSignup = async (req, res) => {
  
  try {
    const { token, name, lastName } = req.body
    const decoded = jwt.verify(token, JWT_SECRET)
    const { googleId, email } = decoded
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' })
    }

    const newUser = new User({
      googleId,
      name,
      lastName,
      email,
    })
    console.log(newUser)
    await newUser.save()

    const authToken = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' })
    return res.status(201).json({ 
      token: authToken, 
      user: { name: newUser.name, lastName: newUser.lastName, email: newUser.email }
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to complete Google signup.' })
  }
}

export const loginUserFromGoogle = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  if (req.user.isNewUser) {
    // Handle new user registration flow
    const { googleId, email, isNewUser } = req.user
    const token = jwt.sign({ googleId, email }, JWT_SECRET, { expiresIn: '10m' })

    const html = `
      <script>
        window.opener.postMessage(
          ${JSON.stringify({ token, email, isNewUser })},
        'http://localhost:5173'
        );
        window.close();
      </script>
    `
    return res.send(html)
  }
  const { googleId, email } = req.user

  const token = jwt.sign({ userId: req.user._id, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' })

  const html = `
    <script>
      window.opener.postMessage(
        ${JSON.stringify({ token, email })},
      'http://localhost:5173'
      );
      window.close();
    </script>
  `
    return res.send(html)

  }

export async function register (req, res) {
  const { name, lastName, email, password, confirmPassword } = req.body

  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords must match.' })

  try {
    const userExists = await User.findOne({ email })

    if (userExists) return res.status(400).json({ message: 'Email already exists.' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({ name, lastName, email, password: hashedPassword })

    const result = await newUser.save()
    
    return res.status(201).json({ email, name, lastName })
    
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
  const userId = req.userId
  const response = await User.findById(userId)

  if (response) {
    return res.status(200).json({ user: response })
  }
  return res.status(401).json({ error: 'User is not logged in.' })
}

export async function getAllUsers (req, res) {
  try {
    const users = await User.find({})

    return res.status(200).json({ users })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
