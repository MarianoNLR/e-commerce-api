import * as z from 'zod';

export const addCartSchema = z.object({
    body: z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
        quantity: z.coerce.number().int().nonnegative("Quantity must be a non-negative number")
    })
});

export const deleteCartItemSchema = z.object({
    params: z.object({
        product: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format")
    })
});