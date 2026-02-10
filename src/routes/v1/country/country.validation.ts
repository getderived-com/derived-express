import { z } from "zod";

// Zod schemas for country validation
export const createCountrySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim(),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must not exceed 10 characters")
    .trim(),
  phoneCode: z
    .string()
    .max(10, "Phone code must not exceed 10 characters")
    .trim()
    .optional(),
});

export const updateCountrySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim()
    .optional(),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must not exceed 10 characters")
    .trim()
    .optional(),
  phoneCode: z
    .string()
    .max(10, "Phone code must not exceed 10 characters")
    .trim()
    .optional(),
});

export const countryFiltersSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  search: z.string().optional()
});

export const countryCodeParamSchema = z.object({
  code: z
    .string()
    .min(1, "Country code is required")
    .trim()
});

export const searchTermParamSchema = z.object({
  searchTerm: z
    .string()
    .min(1, "Search term is required")
    .trim()
});