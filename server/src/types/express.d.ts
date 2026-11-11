import type { OrganizationContext } from "../models/organization.js";

declare global {
  namespace Express {
    interface Request {
      organization?: OrganizationContext;
      actorEmail?: string;
    }
  }
}

export {};
