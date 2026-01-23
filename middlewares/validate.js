import {ZodError, ZodType} from 'zod';
import { BadRequestError } from '../errors/BadRequestError.js';

export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            // Update req object with validated data if needed
            req.body = validatedData.body || req.body;
            req.query = validatedData.query || req.query;
            req.params = validatedData.params || req.params;
            next();
        } catch (error) {
            next(error)
        }
    }
}