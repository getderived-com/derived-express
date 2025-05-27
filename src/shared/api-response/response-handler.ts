import { Response } from "express";
import { APP_SETTINGS } from "../app-settings";
import { StatusCodes } from "./http-status-code";
import { ReasonPhrases } from "./reason-phrase";

//200 OK
export const success = (res: Response, data: any, msg: string) => {
  if (APP_SETTINGS.ENCRYPT) {
    //encrypt data
  }
  const response = {
    result: data,
    status: ReasonPhrases.OK,
    statusCode: StatusCodes.OK,
    msg,
  };
  res.status(response.statusCode).send(response);
};

//500 SERVER ERROR
export const serverError = (res: Response, err: any) => {
  const response = {
    status: ReasonPhrases.INTERNAL_SERVER_ERROR,
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    stack: APP_SETTINGS.IS_DEVELOPMENT ? err.stack : "",
  };

  res.status(response.statusCode).send(response);
};

//404 Not Found
export const notFound = (res: Response, msg: string) => {
  const response = {
    status: ReasonPhrases.NOT_FOUND,
    statusCode: StatusCodes.NOT_FOUND,
    msg,
  };
  res.status(response.statusCode).send(response);
};

//401 Unauthorized
export const unauthorized = (res: Response, msg: string) => {
  const response = {
    status: ReasonPhrases.UNAUTHORIZED,
    statusCode: StatusCodes.UNAUTHORIZED,
    msg,
  };
  res.status(response.statusCode).send(response);
};

//400 Bad Request
export const other = (res: Response, msg: string) => {
  const response = {
    status: ReasonPhrases.BAD_REQUEST,
    statusCode: StatusCodes.BAD_REQUEST,
    msg,
  };
  res.status(response.statusCode).send(response);
};

//409 conflict (Used for duplicate values mainly)
export const alreadyExist = (res: Response, msg: string) => {
  const response = {
    status: ReasonPhrases.CONFLICT,
    statusCode: StatusCodes.CONFLICT,
    msg,
  };
  res.status(response.statusCode).send(response);
};
