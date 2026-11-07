"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrandPanel from "@/components/features/login/BrandPanel";
import LoginForm from "@/components/features/login/LoginForm";
import RegisterForm from "@/components/features/login/RegisterForm";
import styles from "@/styles/login/LoginPage.module.css";

type Mode = "login" | "register";
type Transition =
  | "idle"
  | "exit-to-right"
  | "exit-to-left"
  | "enter-from-left"
  | "enter-from-right";
const TRANSITION_MS = 320;
const ENTER_MS = 400;

export default function AuthPage({
  initialMode,
  googleError = false,
  twoFactorRequired = false,
}: {
  initialMode: Mode;
  googleError?: boolean;
  twoFactorRequired?: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [transition, setTransition] = useState<Transition>("idle");
  const [pageEntering, setPageEntering] = useState(true);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const finish = window.setTimeout(() => setPageEntering(false), 520);
    return () => window.clearTimeout(finish);
  }, []);

  const switchMode = useCallback(
    (nextMode: Mode) => {
      if (nextMode === mode || transition !== "idle") return;

      const registering = nextMode === "register";
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const exitDuration = reducedMotion ? 1 : TRANSITION_MS;
      const enterDuration = reducedMotion ? 1 : ENTER_MS;
      setTransition(registering ? "exit-to-right" : "exit-to-left");
      timeout.current = setTimeout(() => {
        setMode(nextMode);
        window.history.pushState({}, "", registering ? "/register" : "/login");
        setTransition(registering ? "enter-from-left" : "enter-from-right");
        timeout.current = setTimeout(() => setTransition("idle"), enterDuration);
      }, exitDuration);
    },
    [mode, transition],
  );

  useEffect(() => {
    function handlePopState() {
      const nextMode =
        window.location.pathname === "/register" ? "register" : "login";
      setMode(nextMode);
      setTransition("idle");
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  return (
    <main
      className={`${styles.page} ${pageEntering ? styles.pageEntering : ""} ${mode === "register" ? styles.registerMode : ""}`}
    >
      <div
        className={`${styles.brandSwap} ${transition === "enter-from-left" ? styles.brandEnterFromLeft : ""} ${transition === "enter-from-right" ? styles.brandEnterFromRight : ""}`}
        key={`brand-${mode}`}
      >
        <BrandPanel variant={mode} />
      </div>
      <section
        className={`${styles.formPanel} ${styles.formTransition} ${styles[transition]}`}
        key={`form-${mode}`}
      >
        {mode === "login" ? (
          <LoginForm
            onSwitch={() => switchMode("register")}
            googleError={googleError}
            twoFactorRequired={twoFactorRequired}
          />
        ) : (
          <RegisterForm
            onSwitch={() => switchMode("login")}
            googleError={googleError}
          />
        )}
      </section>
    </main>
  );
}
