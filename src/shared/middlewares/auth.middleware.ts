import { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import { UnauthorizedError } from "../utils/http-errors.util";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "secret";

    const decoded = jsonwebtoken.verify(token, secret);
    // @ts-ignore
    req.user = decoded;

    next();
  } catch (error) {
    next(new UnauthorizedError("Unauthorized"));
  }
};
