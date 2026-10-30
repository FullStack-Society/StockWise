"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/layout/AppShell.module.css";

export default function ContentScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScrolling, setIsScrolling] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainer = useRef<HTMLElement>(null);

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
      {children}
    </main>
  );
}
