import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { validateRequest } from "../utils/zod-validate.util";

export const validate = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      validateRequest(req, schemas);
      next();
    } catch (error) {
      next(error);
    }
  }
}