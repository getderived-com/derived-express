import { z } from "zod";

// Zod schemas for user validation
export const registerUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim()
    .refine((val) => val.length > 0, "Name cannot be empty"),
  email: z
    .string()
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must not exceed 50 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number")
});

export const loginUserSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
});

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim()
    .refine((val) => val.length > 0, "Name cannot be empty"),
  email: z
    .string()
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must not exceed 50 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number")
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim()
    .refine((val) => val.length > 0, "Name cannot be empty")
    .optional(),
  email: z
    .string()
    .email("Invalid email format")
    .trim()
    .toLowerCase()
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must not exceed 50 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number")
    .optional()
}).refine(
  (data) => data.name !== undefined || data.email !== undefined || data.password !== undefined,
  "At least one field (name, email, or password) must be provided for update"
);

export const userFiltersSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  search: z.string().optional()
});

export const userEmailParamSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((val) => val.toLowerCase())
});

export const searchTermParamSchema = z.object({
  searchTerm: z
    .string()
    .min(1, "Search term is required")
    .trim()
    .refine((val) => val.length > 0, "Search term cannot be empty")
}); 