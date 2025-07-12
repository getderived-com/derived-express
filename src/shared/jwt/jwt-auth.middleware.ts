import { unauthorized } from "../api-response/response-handler";
import * as jwt from "jsonwebtoken";
import { APP_SETTINGS } from "../app-settings";
import { NextFunction, Request, Response } from "express";

export const secure = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return unauthorized(res, "Invalid token");
    }
    const decoded: any = jwt.verify(token, APP_SETTINGS.JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    unauthorized(res, "token expired");
  }
};
