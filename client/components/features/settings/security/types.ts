import { Mail, MessageSquareText, Smartphone } from "lucide-react";

export const METHODS = [
  {
    name: "Authenticator app",
    detail: "Use a verification app",
    icon: Smartphone,
  },
  { name: "SMS", detail: "Code sent to your phone", icon: MessageSquareText },
  { name: "Email", detail: "Code sent to your email", icon: Mail },
];

export const PRIVACY_OPTIONS = [
  {
    title: "Store usage analytics",
    description: "Help improve StockWise by sharing anonymized usage data.",
  },
  {
    title: "Show my profile to team members",
    description: "Let colleagues see your name and role.",
  },
  {
    title: "Login alert emails",
    description: "Get notified when a new device signs in to your account.",
  },
];
