import { z } from "zod";

// Zod schemas for country validation
export const createCountrySchema = z.object({
  name: z
    .string()
    .min(2, "Country name must be at least 2 characters")
    .max(100, "Country name must not exceed 100 characters")
    .trim()
    .refine((val) => val.length > 0, "Country name cannot be empty"),
  code: z
    .string()
    .min(2, "Country code must be at least 2 characters")
    .max(3, "Country code must not exceed 3 characters")
    .regex(/^[A-Za-z]+$/, "Country code must contain only letters")
    .transform((val) => val.toUpperCase().trim())
});

export const updateCountrySchema = z.object({
  name: z
    .string()
    .min(2, "Country name must be at least 2 characters")
    .max(100, "Country name must not exceed 100 characters")
    .trim()
    .refine((val) => val.length > 0, "Country name cannot be empty")
    .optional(),
  code: z
    .string()
    .min(2, "Country code must be at least 2 characters")
    .max(3, "Country code must not exceed 3 characters")
    .regex(/^[A-Za-z]+$/, "Country code must contain only letters")
    .transform((val) => val.toUpperCase().trim())
    .optional()
}).refine(
  (data) => data.name !== undefined || data.code !== undefined,
  "At least one field (name or code) must be provided for update"
);

export const countryFiltersSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  search: z.string().optional()
});

export const countryCodeParamSchema = z.object({
  code: z
    .string()
    .min(2, "Country code must be at least 2 characters")
    .max(3, "Country code must not exceed 3 characters")
    .regex(/^[A-Za-z]+$/, "Invalid country code format")
    .transform((val) => val.toUpperCase())
});

export const searchTermParamSchema = z.object({
  searchTerm: z
    .string()
    .min(1, "Search term is required")
    .trim()
    .refine((val) => val.length > 0, "Search term cannot be empty")
});

