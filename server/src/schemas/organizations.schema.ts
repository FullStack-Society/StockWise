import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());

export const organizationCreateSchema = z.object({
  email: emailSchema,
  organization_name: z.string(),
});

export const organizationNameUpdateSchema = z.object({
  actor_email: emailSchema,
  organization_name: z.string().min(1).max(160),
});

export const ownershipTransferSchema = z.object({
  actor_email: emailSchema,
  target_email: emailSchema,
});

export const invitationReplySchema = z.object({
  email: emailSchema,
  accept: z.boolean(),
});

export const inviteCreateSchema = z.object({
  actor_email: emailSchema,
  email: emailSchema,
  role: z.enum(["manager", "staff"]),
});

export const memberRoleChangeSchema = z.object({
  actor_email: emailSchema,
  role: z.enum(["manager", "staff"]),
});

export type OrganizationCreateInput = z.input<typeof organizationCreateSchema>;
export type OrganizationCreate = z.output<typeof organizationCreateSchema>;

export type OrganizationNameUpdateInput = z.input<typeof organizationNameUpdateSchema>;
export type OrganizationNameUpdate = z.output<typeof organizationNameUpdateSchema>;

export type OwnershipTransferInput = z.input<typeof ownershipTransferSchema>;
export type OwnershipTransfer = z.output<typeof ownershipTransferSchema>;

export type InvitationReplyInput = z.input<typeof invitationReplySchema>;
export type InvitationReply = z.output<typeof invitationReplySchema>;

export type InviteCreateInput = z.input<typeof inviteCreateSchema>;
export type InviteCreate = z.output<typeof inviteCreateSchema>;

export type MemberRoleChangeInput = z.input<typeof memberRoleChangeSchema>;
export type MemberRoleChange = z.output<typeof memberRoleChangeSchema>;
