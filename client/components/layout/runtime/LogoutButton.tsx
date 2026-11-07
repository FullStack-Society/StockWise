"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

export default function LogoutButton({
  className,
  size = 16,
}: {
  className: string;
  size?: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      <LogOut size={size} aria-hidden />
      {pending ? "Logging out…" : "Logout"}
    </button>
  );
}
