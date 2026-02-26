import * as z from 'zod';

export const getBySearchSchema = z.object({
    query: z.object({
        q: z.string().optional(),
    }),
});

export const getByIdSchema = z.object({
    params: z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
    }),
});

export const addProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Product name is required"),
        price: z.coerce.number().positive("Price must be a positive number"),
        quantity: z.coerce.number().int().nonnegative("Quantity must be a non-negative integer"),
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID format"),
        description: z.string().optional(),
    }),
});

export const updateProductSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
    }),
    body: z.object({
        name: z.string().min(1, "Product name is required").optional(),
        price: z.coerce.number().positive("Price must be a positive number").optional(),
        quantity: z.coerce.number().int().nonnegative("Quantity must be a non-negative integer").optional(),
        description: z.string().optional(),
        imagesToKeep: z.array(z.url("Invalid image URL format")).optional().default([]),
    }),
});

export const updateProductStockSchema = z.object({
    params: z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
    }),
    body: z.object({
        stock: z.coerce.number().int().nonnegative("Stock must be a non-negative integer"),
    }),
});

export const deleteProductSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
    }),
});