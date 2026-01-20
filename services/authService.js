import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'
import User from '../models/User.js'
import { verifyToken } from '../utils/verifyToken.js'
import { NotFoundError } from '../errors/NotFoundError.js'
import { BadRequestError } from '../errors/BadRequestError.js'

const { JWT_SECRET } = process.env

export async function login ({ email, password }) {
    const user = await User.findOne({ email })
    if (!user) {
        throw new BadRequestError('Email or password incorrect.')
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
        throw new BadRequestError('Email or password incorrect.')
    }
    const token = jwt.sign({ userId: user._id}, JWT_SECRET)

    // res.cookie('access_token', token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'None'
    // })

    return { token }
}

export async function register ({ name, lastName, email, password, confirmPassword }) {
    if (password !== confirmPassword) {
        throw new BadRequestError('Passwords do not match.')
    }
    
    const userExists = await User.findOne({ email })
    if (userExists) {
        throw new BadRequestError('Email already in use.')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
        name,
        lastName,
        email,
        password: hashedPassword
    })
    await newUser.save()
    const token = await login({ email: newUser.email, password })
    return token
}

export async function loginUserFromGoogle ({ googleId, email }) {
    const existingUser = await User.findOne({ googleId })
    if (!existingUser) {
        const tempToken = jwt.sign({ googleId, email }, JWT_SECRET, { expiresIn: '10m' })  
        // const payload = { token: tempToken, email, isNewUser: true }

        return {
            token: tempToken,
            email,
            isNewUser: true
        }
    }

    const token = jwt.sign({ userId: existingUser._id, role: existingUser.role }, JWT_SECRET, { expiresIn: '7d' })
    // const payload = { token, email, isNewUser: false }
    return {
        token,
        email,
        isNewUser: false
    }
}

export async function completeGoogleSignup ({ token, name, lastName }) {
    const decoded = verifyToken(token)
    const { googleId, email } = decoded
    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new BadRequestError('Email already in use.')
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
        token: authToken, 
        user: { name: newUser.name, lastName: newUser.lastName, email: newUser.email }
    }
}

export async function getMe ({ userId }) {
    const user = await User.findById(userId).select('-password')
    if (user) {
        return { user }
    } else {
        throw new NotFoundError('User not found.')
    }
}
  