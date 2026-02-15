import type { Response, Request } from "express";
import { HttpError } from "../utils/http-errors.util";
import { logger } from "../logger";
import { APP_SETTINGS } from "../app-settings";

interface ErrorResponse {
  success: false;
  message: string;
  errorCode: number;
  stack?: string;
  details?: unknown;
}

export const errorHandler = (err: Error, req: Request, res: Response) => {
  // Default error
  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  let isOperational = false;
  let errorDetails: unknown;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorDetails = err.details;
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: errorMessage,
    errorCode: statusCode,
    details: errorDetails,
  };

  if (APP_SETTINGS.IS_DEVELOPMENT) {
    errorResponse.stack = err.stack;
  }

  logger.error(`[Error] ${errorMessage}`, {
    statusCode,
    isOperational,
    stack: err.stack,
  });

  res.status(statusCode).json(errorResponse);
};
