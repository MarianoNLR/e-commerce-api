import jwt from 'jsonwebtoken'
import dotenv from 'dotenv/config'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

const { JWT_SECRET, JWT_REFRESH_TOKEN_SECRET } = process.env

// Used to verify JWT tokens, if error occurs, it will be handled in errorHandler middleware
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        throw new UnauthorizedError('Invalid token.')
    }
    
}

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET)    
    } catch (error) {
        throw new UnauthorizedError('Invalid refresh token.')
    }
    
}