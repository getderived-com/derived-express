import { z } from "zod";

// Zod schemas for state validation
export const createStateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim(),
  countryId: z.number().int("Country ID must be an integer"),
});

export const updateStateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim()
    .optional(),
  countryId: z.number().int("Country ID must be an integer").optional(),
});

export const countryIdParamSchema = z.object({
  countryId: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Country ID must be a valid number",
  }),
});
