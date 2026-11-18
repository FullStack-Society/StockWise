import { z } from "zod";

export const gmailDomains = new Set(["gmail.com", "googlemail.com"]);

export const emailSchema = z.string().email();

export const deviceIdSchema = z.string().min(32).max(128).nullable().optional();

function gmailAddress(message: string) {
  return emailSchema.superRefine((email, context) => {
    if (
      !gmailDomains.has(email.slice(email.lastIndexOf("@") + 1).toLowerCase())
    ) {
      context.addIssue({ code: "custom", message });
    }
  });
}

function strongPassword(minLength: number) {
  return z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters.`)
    .max(128)
    .superRefine((password, context) => {
      if (!/[A-Z]/.test(password)) {
        context.addIssue({
          code: "custom",
          message: "Password must contain at least one capital letter.",
        });
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        context.addIssue({
          code: "custom",
          message: "Password must contain at least one special character.",
        });
      }
    });
}

export const loginSchema = z.object({
  email: gmailAddress(
    "Use the Gmail address linked to your StockWise account.",
  ),
  password: z.string().min(1).max(128),
  device_id: deviceIdSchema,
});

export const registrationSchema = z.object({
  name: z.string().min(1).max(160),
  email: gmailAddress("Register with a Gmail address."),
  password: strongPassword(8),
});

export const emailCheckSchema = z.object({
  email: gmailAddress("Register with a Gmail address."),
});

export const registrationVerifySchema = z.object({
  email: gmailAddress("Use the Gmail address from your registration."),
  code: z.string().regex(/^\d{8}$/, "String should match pattern '^\\d{8}$'."),
});

export const registrationResendSchema = z.object({
  email: gmailAddress("Use your Gmail address."),
});

export const googleCredentialSchema = z.object({
  credential: z.string().min(1).max(8192),
  nonce: z.string().min(16).max(128),
  device_id: deviceIdSchema,
  mode: z.enum(["login", "register"]).default("login"),
});

export const googleRegistrationSchema = z.object({
  credential: z.string().min(1).max(8192),
  nonce: z.string().min(16).max(128),
  password: strongPassword(8),
  device_id: deviceIdSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  new_password: strongPassword(12),
});

export const twoFactorLoginSchema = z.object({
  challenge_token: z.string().min(32).max(256),
  code: z.string().min(6).max(32),
  device_id: deviceIdSchema,
});

export type LoginInput = z.input<typeof loginSchema>;
export type Login = z.output<typeof loginSchema>;

export type RegistrationInput = z.input<typeof registrationSchema>;
export type Registration = z.output<typeof registrationSchema>;

export type EmailCheckInput = z.input<typeof emailCheckSchema>;
export type EmailCheck = z.output<typeof emailCheckSchema>;

export type RegistrationVerifyInput = z.input<typeof registrationVerifySchema>;
export type RegistrationVerify = z.output<typeof registrationVerifySchema>;

export type RegistrationResendInput = z.input<typeof registrationResendSchema>;
export type RegistrationResend = z.output<typeof registrationResendSchema>;

export type GoogleCredentialInput = z.input<typeof googleCredentialSchema>;
export type GoogleCredential = z.output<typeof googleCredentialSchema>;

export type GoogleRegistrationInput = z.input<typeof googleRegistrationSchema>;
export type GoogleRegistration = z.output<typeof googleRegistrationSchema>;

export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ForgotPassword = z.output<typeof forgotPasswordSchema>;

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPassword = z.output<typeof resetPasswordSchema>;

export type TwoFactorLoginInput = z.input<typeof twoFactorLoginSchema>;
export type TwoFactorLogin = z.output<typeof twoFactorLoginSchema>;
