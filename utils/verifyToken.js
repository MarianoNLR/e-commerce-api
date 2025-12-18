import jwt from 'jsonwebtoken'
import dotenv from 'dotenv/config'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

const { JWT_SECRET } = process.env

// Used to throw an error if token is invalid or expired
export function verifyToken(token) {
    
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired token.')
    }
}