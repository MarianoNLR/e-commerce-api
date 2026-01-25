import * as z from 'zod';

export const getByIdSchema = z.object({
    params: z.object({
        categoryId: z.string().regexp(/^[0-9a-fA-F]{24}$/, "Invalid category ID format")
    })
});

export const addCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, "Category name is required"),
    })
});

export const deleteCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regexp(/^[0-9a-fA-F]{24}$/, "Invalid category ID format")
    })
});

export const updateCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regexp(/^[0-9a-fA-F]{24}$/, "Invalid category ID format")
    }),
    body: z.object({
        name: z.string().min(1, "Category name is required").optional()
    })
});
    