import { ZodError } from 'zod'
import { sendError } from '../utils/apiResponse.js'

export function errorHandler(err, req, res, next) {
    console.log(err)
    // Handle Zod validation errors. TODO: create custom ValidationError class.
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map(e => ({
            field: e.path.slice(1).join('.'),
            message: e.message
        }))

        return sendError(
            res,
            {
                code: 'VALIDATION_ERROR',
                message: 'Validation Error',
                details: formattedErrors
            },
            400
        )
    }

    // Handle JWT errors
    if (err.name === 'TokenExpiredError') {
        return sendError(
            res,
            {
                code: 'ACCESS_TOKEN_EXPIRED',
                message: 'Access token expired.',
                details: null
            },
            401
        )
    }

    if (err.name === 'JsonWebTokenError') {
        return sendError(
            res,
            {
                code: 'INVALID_ACCESS_TOKEN',
                message: 'Invalid access token.',
                details: null
            },
            401
        )
    }

    // Handle operational errors
    if (err.isOperational) {
        return sendError(res, err, err.statusCode || 500)
    }

    console.error('Unexpected Error:', err)
    return sendError(
        res,
        {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error.',
            details: null
        },
        500
    )
}