import * as jwt from "jsonwebtoken";
import { APP_SETTINGS } from "../app-settings";

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, APP_SETTINGS.JWT_SECRET);
};

export const decodeToken = (token: string): any => {
  try {
    const decode = jwt.verify(token, APP_SETTINGS.JWT_SECRET);
    return decode;
  } catch (error) {
    return false;
  }
};
