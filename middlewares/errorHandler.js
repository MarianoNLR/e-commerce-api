import { UnauthorizedError } from '../errors/UnauthorizedError.js';

export function errorHandler(err, req, res, next) {

    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        err = new UnauthorizedError('Invalid or expired token.')
    }

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    console.error('Unexpected Error:', err);
    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
}