import jwt from 'jsonwebtoken'
import dotenv from 'dotenv/config'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

const { JWT_SECRET } = process.env

export function verifyToken(token) {
    
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired token.')
    }
}