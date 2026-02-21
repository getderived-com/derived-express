import { z } from "zod";

export const createCitySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim(),
  stateId: z.number().int("State ID must be an integer"),
});

export const updateCitySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters")
    .trim()
    .optional(),
  stateId: z.number().int("State ID must be an integer").optional(),
});

export const stateIdParamSchema = z.object({
  stateId: z.string().refine((val) => !isNaN(Number(val)), {
    message: "State ID must be a valid number",
  }),
});
