import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Inventory", href: ROUTES.inventory, icon: Boxes },
  { label: "Orders", href: ROUTES.orders, icon: ClipboardList },
  { label: "Sales", href: ROUTES.sales, icon: ShoppingCart },
  { label: "Reports", href: ROUTES.reports, icon: BarChart3 },
  { label: "Users", href: ROUTES.users, icon: Users },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];
