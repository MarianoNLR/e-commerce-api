export function errorHandler(err, req, res, next) {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    console.error('Unexpected Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
}