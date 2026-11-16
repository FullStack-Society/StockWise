import type { OrganizationContext } from "../types/organization.js";

declare global {
  namespace Express {
    interface Request {
      organization?: OrganizationContext;
      actorEmail?: string;
    }
  }
}

export {};
