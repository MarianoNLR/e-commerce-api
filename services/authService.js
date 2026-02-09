import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import 'dotenv/config'
import User from '../models/User.js'
import { verifyToken } from '../utils/verifyToken.js'
import { NotFoundError } from '../errors/NotFoundError.js'
import { BadRequestError } from '../errors/BadRequestError.js'
import Session from '../models/Session.js'

const { JWT_SECRET, JWT_REFRESH_TOKEN_SECRET } = process.env

export async function login ({ email, password, userAgent, ipAddress }) {
    const user = await User.findOne({ email })
    if (!user) {
        throw new BadRequestError('Email or password incorrect.')
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
        throw new BadRequestError('Email or password incorrect.')
    }
    const accessToken = jwt.sign({ userId: user._id}, JWT_SECRET, { expiresIn: '15m' })

    const refreshToken = jwt.sign({ userId: user._id}, JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    const refrehTokenHashed = crypto.createHash('sha256').update(refreshToken).digest('hex')

    await Session.create({
        user: user._id,
        refreshToken: refrehTokenHashed,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7*24*60*60*1000) // 7 days
    })

    return { accessToken, refreshToken }
}

export async function register ({ name, lastName, email, password, confirmPassword, userAgent, ipAddress }) {
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
    const token = await login({ email: newUser.email, password, userAgent, ipAddress})
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

    const token = jwt.sign({ userId: existingUser._id, role: existingUser.role }, JWT_SECRET, { expiresIn: '15m' })
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
    const authToken = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '15m' })
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
  