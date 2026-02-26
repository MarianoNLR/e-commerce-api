import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
    constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
        super(message, 400, code);
    }
}