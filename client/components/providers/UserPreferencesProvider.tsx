"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AccountSettings } from "@/lib/api/settings";
import type { CurrencyRates } from "@/lib/utils/format";

const CURRENCY_RATES_CACHE_KEY = "stockwise-currency-rates-v1";
const CURRENCY_RATES_URL =
  "https://api.frankfurter.dev/v1/latest?base=USD&symbols=PHP,EUR";
const CURRENCY_RATES_REFRESH_INTERVAL = 60 * 60 * 1000;

type CachedCurrencyRates = {
  rates: CurrencyRates;
  updatedAt: string;
};

type PreferenceValues = Pick<
  AccountSettings,
  | "timezone"
  | "invitation_notifications"
  | "theme"
  | "date_format"
  | "currency"
  | "density"
  | "auto_sync_reports"
  | "prioritize_low_stock"
>;

type UserPreferences = PreferenceValues & {
  currencyRates: CurrencyRates | null;
  currencyRatesUpdatedAt: string | null;
  currencyRatesError: string | null;
};

type PreferencesContextValue = UserPreferences & {
  desktopStockAlertsEnabled: boolean;
  setDesktopStockAlertsEnabled: (enabled: boolean) => void;
  setAutoSyncReportsEnabled: (enabled: boolean) => void;
};
const DESKTOP_ALERTS_KEY = "stockwise-desktop-stock-alerts-v1";
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function useUserPreferences() {
  const preferences = useContext(PreferencesContext);
  if (!preferences) {
    throw new Error("User preferences must be read within the app shell.");
  }
  return preferences;
}

export default function UserPreferencesProvider({
  preferences,
  children,
}: {
  preferences: PreferenceValues;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(
    null,
  );
  const [currencyRatesUpdatedAt, setCurrencyRatesUpdatedAt] = useState<
    string | null
  >(null);
  const [currencyRatesError, setCurrencyRatesError] = useState<string | null>(
    null,
  );
  const [desktopStockAlertsEnabled, setDesktopStockAlertsEnabledState] =
    useState(false);
  const [autoSyncReportsEnabled, setAutoSyncReportsEnabled] = useState(
    preferences.auto_sync_reports,
  );

  useEffect(() => {
    // Syncs the saved server preference after router.refresh().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoSyncReportsEnabled(preferences.auto_sync_reports);
  }, [preferences.auto_sync_reports]);

  const setDesktopStockAlertsEnabled = (enabled: boolean) => {
    setDesktopStockAlertsEnabledState(enabled);
    try {
      window.localStorage.setItem(DESKTOP_ALERTS_KEY, String(enabled));
    } catch (error) {
      console.error("[StockWise] Unable to save desktop alert preference:", error);
    }
  };

  useEffect(() => {
    try {
      // Restores this browser's opt-in after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDesktopStockAlertsEnabledState(
        window.localStorage.getItem(DESKTOP_ALERTS_KEY) === "true",
      );
    } catch (error) {
      console.error("[StockWise] Unable to read desktop alert preference:", error);
    }
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === DESKTOP_ALERTS_KEY) {
        setDesktopStockAlertsEnabledState(event.newValue === "true");
      }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  useEffect(() => {
    if (
      !autoSyncReportsEnabled ||
      !["/pages/reports", "/pages/dashboard"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refreshIfVisible, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [autoSyncReportsEnabled, pathname, router]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    try {
      const cached = window.localStorage.getItem(CURRENCY_RATES_CACHE_KEY);
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "rates" in parsed &&
          "updatedAt" in parsed
        ) {
          const value = parsed as CachedCurrencyRates;
          const cachedPhp = value.rates?.PHP;
          const cachedEur = value.rates?.EUR;
          if (
            typeof value.updatedAt === "string" &&
            typeof cachedPhp === "number" &&
            Number.isFinite(cachedPhp) &&
            cachedPhp > 0 &&
            typeof cachedEur === "number" &&
            Number.isFinite(cachedEur) &&
            cachedEur > 0
          ) {
            // Restores a validated localStorage cache before the network response.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrencyRates({ USD: 1, PHP: cachedPhp, EUR: cachedEur });
            setCurrencyRatesUpdatedAt(value.updatedAt);
          }
        }
      }
    } catch (error) {
      console.error("[StockWise] Unable to read cached currency rates:", error);
    }

    async function refreshCurrencyRates() {
      try {
        const response = await fetch(CURRENCY_RATES_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Exchange-rate service returned ${response.status}.`);
        }
        const payload: unknown = await response.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("rates" in payload) ||
          !("date" in payload)
        ) {
          throw new Error("Exchange-rate service returned invalid data.");
        }
        const { rates, date } = payload as {
          rates: { PHP?: number; EUR?: number };
          date: string;
        };
        const phpRate = rates?.PHP;
        const eurRate = rates?.EUR;
        if (
          typeof phpRate !== "number" ||
          !Number.isFinite(phpRate) ||
          phpRate <= 0 ||
          typeof eurRate !== "number" ||
          !Number.isFinite(eurRate) ||
          eurRate <= 0 ||
          typeof date !== "string"
        ) {
          throw new Error("Exchange-rate service returned invalid rates.");
        }
        const next: CachedCurrencyRates = {
          rates: { USD: 1, PHP: phpRate, EUR: eurRate },
          updatedAt: date,
        };
        if (!active) return;
        setCurrencyRates(next.rates);
        setCurrencyRatesUpdatedAt(next.updatedAt);
        setCurrencyRatesError(null);
        try {
          window.localStorage.setItem(
            CURRENCY_RATES_CACHE_KEY,
            JSON.stringify(next),
          );
        } catch (error) {
          console.error("[StockWise] Unable to cache currency rates:", error);
        }
      } catch (error) {
        if (
          !active ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        console.error("[StockWise] Unable to refresh currency rates:", error);
        setCurrencyRatesError("Could not refresh exchange rates.");
      }
    }

    void refreshCurrencyRates();
    const rateTimer = window.setInterval(
      refreshCurrencyRates,
      CURRENCY_RATES_REFRESH_INTERVAL,
    );
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(rateTimer);
    };
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        ...preferences,
        currencyRates,
        currencyRatesUpdatedAt,
        currencyRatesError,
        desktopStockAlertsEnabled,
        setDesktopStockAlertsEnabled,
        auto_sync_reports: autoSyncReportsEnabled,
        setAutoSyncReportsEnabled,
      }}
    >
      <div
        data-theme={preferences.theme}
        data-density={preferences.density}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </PreferencesContext.Provider>
  );
}
