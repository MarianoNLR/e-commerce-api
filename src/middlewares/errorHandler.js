import { ZodError } from 'zod';
import { UnauthorizedError } from '../errors/UnauthorizedError.js';
import { errors } from 'mongodb-memory-server';

export function errorHandler(err, req, res, next) {
    console.log(err)
    // Handle Zod validation errors. TODO: create custom ValidationError class.
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map(e => ({
            field: e.path.slice(1).join('.'),
            message: e.message
        }));

        return res.status(400).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Validation Error',
            errors: formattedErrors
        });
    }

    // Handle JWT errors
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            code: 'ACCESS_TOKEN_EXPIRED',
            message: 'Access token expired.',
            errors: []
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            code: 'INVALID_ACCESS_TOKEN',
            message: 'Invalid access token.',
            errors: []
        });
    }

    // Handle operational errors
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: 'error',
            code: err.code,
            message: err.message,
            errors: []
        });
    }

    console.error('Unexpected Error:', err);
    return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        errors: []
    });
}