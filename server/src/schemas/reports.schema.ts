import { z } from "zod";

export const pageSchema = z.object({
  page: z.enum([
    "dashboard",
    "inventory",
    "orders",
    "reports",
    "settings",
    "users",
  ]),
});

export type PageInput = z.input<typeof pageSchema>;
export type Page = z.output<typeof pageSchema>;
