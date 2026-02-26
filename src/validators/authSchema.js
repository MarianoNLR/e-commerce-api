import * as z from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
    }),
});

export const completeGoogleSignupSchema = z.object({
    body: z.object({
        token: z.string().nonempty("Token is required"),
        name: z.string().min(1, "Name is required"),
        lastName: z.string().min(1, "Last name is required"),
    }),
});

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
        confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters long"),
        
    }).refine((data) => data.body.password === data.body.confirmPassword, 
    {
        message: "Passwords do not match",
        path: ["body", "confirmPassword"],
    }),
})