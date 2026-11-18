"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import LogoutButton from "@/components/layout/runtime/LogoutButton";
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
        <LogoutButton className={styles.logout} />
      </form>
    </aside>
  );
}
