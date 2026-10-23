"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { NAV_ITEMS } from "@/app/navigation";
import { logout } from "@/lib/auth/actions";
import styles from "@/styles/layout/SideBar.module.css";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <Logo />
      </div>

      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`${styles.link} ${isActive ? styles.active : ""}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className={styles.logoutForm}>
        <button type="submit" className={styles.logout}>
          <LogOut size={16} />
          Logout
        </button>
      </form>
    </aside>
  );
}
