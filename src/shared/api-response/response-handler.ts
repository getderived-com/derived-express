import { Response } from "express";
import { StatusCodes } from "./http-status-code";
import { ReasonPhrases } from "./reason-phrase";

//200 OK
export const success = (res: Response, data: any, msg: string) => {
  const response = {
    result: data,
    status: ReasonPhrases.OK,
    statusCode: StatusCodes.OK,
    msg,
  };
  res.status(response.statusCode).send(response);
};
