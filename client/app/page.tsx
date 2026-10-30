import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ROUTES } from "./routes";

export const instant = false;

export default async function Home() {
  redirect((await getSession()) ? ROUTES.dashboard : ROUTES.login);
}
