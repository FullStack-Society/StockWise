"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "@/styles/layout/AppShell.module.css";

export default function ContentScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScrolling, setIsScrolling] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settingsSection =
    pathname === "/pages/settings" ? searchParams.toString() : "";
  const animationKey = settingsSection
    ? `${pathname}?${settingsSection}`
    : pathname;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainer = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollContainer.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname, settingsSection]);

  useEffect(() => {
    const element = scrollContainer.current;
    if (!element) return;

    function handleScroll() {
      setIsScrolling(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setIsScrolling(false), 900);
    }

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", handleScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <main
      ref={scrollContainer}
      className={`${styles.content} ${isScrolling ? styles.scrolling : ""}`}
    >
      <div className={styles.pageEntrance} key={animationKey}>
        {children}
      </div>
    </main>
  );
}
