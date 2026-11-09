"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/app/navigation";
import LogoutButton from "@/components/layout/runtime/LogoutButton";
import { logout } from "@/lib/auth/actions";
import styles from "@/styles/layout/MobileNavigation.module.css";

export default function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        className={`${styles.menuButton} ${open ? styles.menuButtonOpen : ""}`}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-drawer"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
        <aside
          id="mobile-navigation-drawer"
          className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
          aria-label="Mobile navigation"
        >
          <nav className={styles.nav} aria-label="Main">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${styles.link} ${isActive ? styles.active : ""}`}
                  onClick={closeMenu}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <form action={logout} className={styles.logoutForm}>
            <LogoutButton className={styles.logout} size={18} />
          </form>
        </aside>
      </div>
    </>
  );
}
