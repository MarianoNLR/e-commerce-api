import * as z from 'zod';

export const getUserByIdSchema = z.object({
    params: z.object({
        userId: z.string().regexp(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});