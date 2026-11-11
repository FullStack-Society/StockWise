import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    if (error.headers) res.set(error.headers);
    res.status(error.status).json({ detail: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      detail: error.issues.map((issue) => ({
        loc: ["body", ...issue.path],
        msg: issue.message,
        type: issue.code,
      })),
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ detail: "Malformed JSON request body." });
    return;
  }

  console.error("[StockWise Node API] Unhandled request error:", error);
  res.status(500).json({ detail: "An unexpected error occurred." });
};
