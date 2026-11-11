import type { Request } from "express";
import { HttpError } from "../middlewares/error-handler.js";

export function requiredPathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new HttpError(422, `Invalid path parameter '${name}'.`);
  }
  return value;
}
