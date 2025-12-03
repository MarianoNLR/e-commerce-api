import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'
import User from '../models/User.js'

const { JWT_SECRET } = process.env

export async function login ({ email, password }) {
    const user = await User.findOne({ email })
    console.log('USER FOUND IN AUTH SERVICE:', user)
    if (!user) {
        const err = new Error('Email or password incorrect.')
        err.status = 401
        throw err
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
        const err = new Error('Email or password incorrect.')
        err.status = 401
        throw err
    }
    const token = jwt.sign({ userId: user._id}, JWT_SECRET)

    // res.cookie('access_token', token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'None'
    // })

    return token
}

export async function register ({ name, lastName, email, password, confirmPassword }) {
    const err = new Error('Internal Server Error')
    err.status = 500

    if (password !== confirmPassword) {
        err.message = 'Passwords do not match.'
        err.status = 400
        throw err
    }
    
    const userExists = await User.findOne({ email })
    if (userExists) {
        err.message = 'Email already in use.'
        err.status = 400
        throw err
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
        name,
        lastName,
        email,
        password: hashedPassword
    })
    await newUser.save()
    const token = await login({ email: newUser.email, password: newUser.password })
    return token
}

export async function loginUserFromGoogle ({ googleId, email }) {
    const existingUser = await User.findOne({ googleId })
    if (!existingUser) {
        const tempToken = jwt.sign({ googleId, email }, JWT_SECRET, { expiresIn: '10m' })  
        const payload = { token: tempToken, email, isNewUser: true }

        return {status: 200, payload }
    }

    const token = jwt.sign({ userId: req.user._id, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' })
    const payload = { token, email, isNewUser: false }
    return {status: 200, payload }
}

export async function completeGoogleSignup ({ token, name, lastName }) {
    const decoded = jwt.verify(token, JWT_SECRET)
    const { googleId, email } = decoded
    const existingUser = await User.findOne({ email })
    if (existingUser) {
        const err = new Error('Email already in use.')
        err.status = 400
        throw err
    }

    const newUser = new User({
        googleId,
        name,
        lastName,
        email,
    })
    await newUser.save()
    const authToken = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' })
    return {
        status: 201, 
        payload: {
            token: authToken, 
            user: { name: newUser.name, lastName: newUser.lastName, email: newUser.email }
        }
    }
}

export async function getMe ({ userId }) {
    const user = await User.findById(userId).select('-password')
    if (user) {
        return { user }
    } else {
        const err = new Error('User not found.')
        err.status = 404
        throw err
    }
}
  