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
    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '15m' })

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

export async function refreshToken (refreshToken, userAgent, ipAddress) {
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided.')
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET)
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN')
    }
    
      
    const hashRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex')

    // verify and consume the refresh token atomically to prevent reuse
    const consumedSession = await Session.findOneAndUpdate(
      {
        user: payload.userId,
        refreshToken: hashRefreshToken,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      },
      { revokedAt: new Date(),
        revokedReason: 'refresh'
      },

      { new: false }
    )

    // If no session was found, it means the token was already used or revoked
    if (!consumedSession) {
      // Check if the token was already revoked (possible reuse)
      const existingSession = await Session.findOne({ refreshToken: hashRefreshToken })

      // Session not found at all, treat as normal invalid token
      if (!existingSession) {
        throw new UnauthorizedError('Refresh token not found. Please log in again.', 'REFRESH_TOKEN_NOT_FOUND')
      }

      // Token expired, treat as normal expired token
      if (existingSession.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED')
      }

        // Token was revoked
        if (existingSession.revokedAt) {
            if (existingSession.revokedReason === 'reuse_detected') {
                    throw new UnauthorizedError('Refresh token already revoked due to reuse detection.', 'REFRESH_TOKEN_REUSE')
            }

            if (existingSession.revokedReason === 'refresh') {
                // Revoke all sessions for the user because of possible token reuse
                // Could use familyId in Session model to only revoke related sessions if implementing token rotation with family IDs
                // and determine if reuse is actually happening or just a race condition with multiple refresh requests
                await Session.updateMany(
                { user: payload.userId },
                { revokedAt: new Date(), revokedReason: 'reuse_detected' }
                )
                throw new UnauthorizedError('Refresh token already used.', 'REFRESH_TOKEN_ALREADY_ROTATED')        
            }  
            throw new UnauthorizedError('Invalid refresh token. Please log in again.', 'INVALID_REFRESH_TOKEN')
        }
        throw new UnauthorizedError('Unable to process refresh token.', 'REFRESH_TOKEN_INVALID')
      }

    // Generate new tokens
    const newAccessToken = jwt.sign({ userId: payload.userId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn: '15m' })
    const newRefreshToken = jwt.sign({ userId: payload.userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    const hashedNewRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

    // Create new session
    await Session.create({
      user: payload.userId,
      refreshToken: hashedNewRefreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7*24*60*60*1000)
    })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout( refreshToken ) {
    await Session.deleteOne({ refreshToken })
}