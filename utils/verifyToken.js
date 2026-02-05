import jwt from 'jsonwebtoken'
import dotenv from 'dotenv/config'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

const { JWT_SECRET, JWT_REFRESH_TOKEN_SECRET } = process.env

// Used to verify JWT tokens, if error occurs, it will be handled in errorHandler middleware
export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET)
    
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_TOKEN_SECRET)
}