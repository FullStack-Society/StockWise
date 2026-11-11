import type { Response } from "express";
import { z, type ZodType } from "zod";

export function parseAt<T extends ZodType>(
  schema: T,
  value: unknown,
  source: "query" | "path",
  res: Response,
): z.output<T> | undefined {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  res.status(422).json({
    detail: parsed.error.issues.map((issue) => ({
      loc: [source, ...issue.path],
      msg: issue.message,
      type: issue.code,
    })),
  });
  return undefined;
}
