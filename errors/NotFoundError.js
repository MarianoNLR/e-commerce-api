import { AppError } from "./AppError.js";

export class NotFoundError extends AppError {
    constructor(message = 'Not Found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}