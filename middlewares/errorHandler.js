import { ZodError } from 'zod';
import { UnauthorizedError } from '../errors/UnauthorizedError.js';
import { errors } from 'mongodb-memory-server';

export function errorHandler(err, req, res, next) {

    // Handle Zod validation errors. TODO: create custom ValidationError class.
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map(e => ({
            field: e.path.slice(1).join('.'),
            message: e.message
        }));

        return res.status(400).json({
            status: 'error',
            message: 'Validation Error',
            errors: formattedErrors
        });
    }

    // Handle JWT errors
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        err = new UnauthorizedError('Invalid or expired token.')
    }

    // Handle operational errors
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            errors: []
        });
    }

    console.error('Unexpected Error:', err);
    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        errors: []
    });
}