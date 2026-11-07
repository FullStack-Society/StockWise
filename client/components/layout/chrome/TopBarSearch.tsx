"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Palette,
  Package,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/layout/TopBarSearch.module.css";

type SearchItem = {
  id: string;
  label: string;
  detail: string;
  keywords: string;
  href: string;
  icon: LucideIcon;
};

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    detail: "Overview and stock summary",
    keywords: "home overview stats recent activity",
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    label: "Inventory",
    detail: "Open inventory management",
    keywords: "products stock categories items add import export",
    href: ROUTES.inventory,
    icon: Boxes,
  },
  {
    id: "orders",
    label: "Orders",
    detail: "Create purchase orders and receive deliveries",
    keywords: "purchase order purchasing supplier ordered delivery receive stock",
    href: ROUTES.orders,
    icon: ClipboardList,
  },
  {
    id: "reports",
    label: "Reports",
    detail: "Inventory reports and trends",
    keywords: "analytics charts movement export",
    href: ROUTES.reports,
    icon: BarChart3,
  },
  {
    id: "users",
    label: "Users & permissions",
    detail: "Manage team members, roles, and invitations",
    keywords:
      "team members staff manager owner invite invitations access roles permissions",
    href: ROUTES.users,
    icon: Users,
  },
  {
    id: "settings",
    label: "Settings",
    detail: "Account settings",
    keywords: "preferences profile security organization billing account",
    href: ROUTES.settings,
    icon: Settings,
  },
  {
    id: "profile",
    label: "Personal profile",
    detail: "Name, email, and account details",
    keywords: "settings user account personal name email",
    href: `${ROUTES.settings}?section=profile`,
    icon: UserRound,
  },
  {
    id: "organization-settings",
    label: "Organization name",
    detail: "Change the organization name in Security & Privacy",
    keywords: "settings company workspace organization name",
    href: `${ROUTES.settings}?section=security#organization-settings-title`,
    icon: ShieldCheck,
  },
  {
    id: "security",
    label: "Security",
    detail: "Password and account security",
    keywords: "settings password security delete account",
    href: `${ROUTES.settings}?section=security`,
    icon: ShieldCheck,
  },
  {
    id: "preferences",
    label: "Preferences",
    detail: "Timezone and invitation notifications",
    keywords:
      "settings notification notifications timezone regional appearance theme date format currency inventory defaults low stock display",
    href: `${ROUTES.settings}?section=preferences`,
    icon: SlidersHorizontal,
  },
  {
    id: "appearance",
    label: "Appearance & display",
    detail: "Theme, date format, currency, and display density",
    keywords:
      "settings preferences appearance display theme dark light system date format currency usd php eur density compact comfortable language",
    href: `${ROUTES.settings}?section=preferences#appearance-title`,
    icon: Palette,
  },
  {
    id: "notifications",
    label: "Notifications",
    detail: "Organization invitation notifications",
    keywords:
      "settings preferences notifications email push in app invitation membership alerts",
    href: `${ROUTES.settings}?section=preferences#notifications-title`,
    icon: Bell,
  },
  {
    id: "inventory-defaults",
    label: "Inventory defaults",
    detail: "Stock thresholds and inventory display behavior",
    keywords:
      "settings preferences inventory defaults low stock critical threshold reorder auto sync reports prioritize",
    href: `${ROUTES.settings}?section=preferences#inventory-defaults-title`,
    icon: Package,
  },
  {
    id: "regional",
    label: "Regional settings",
    detail: "Timezone and calendar preferences",
    keywords:
      "settings preferences regional timezone time zone calendar first day week monday",
    href: `${ROUTES.settings}?section=preferences#regional-title`,
    icon: Globe2,
  },
  {
    id: "password",
    label: "Password",
    detail: "Change your account password",
    keywords: "settings security password change update current new",
    href: `${ROUTES.settings}?section=security#password-title`,
    icon: ShieldCheck,
  },
  {
    id: "two-factor",
    label: "Two-factor authentication",
    detail: "Additional account security",
    keywords:
      "settings security two factor authentication 2fa backup codes recovery",
    href: `${ROUTES.settings}?section=security#two-factor-title`,
    icon: ShieldCheck,
  },
  {
    id: "privacy",
    label: "Privacy",
    detail: "Account information and activity controls",
    keywords: "settings security privacy data activity controls",
    href: `${ROUTES.settings}?section=security#privacy-title`,
    icon: ShieldCheck,
  },
  {
    id: "delete-account",
    label: "Delete account",
    detail: "Deactivate your account",
    keywords: "settings profile delete deactivate account danger zone",
    href: `${ROUTES.settings}?section=profile#delete-account`,
    icon: UserRound,
  },
  {
    id: "billing",
    label: "Billing & subscription",
    detail: "Subscription details",
    keywords:
      "settings billing subscription plan payment invoice receipt company address history",
    href: `${ROUTES.settings}?section=billing`,
    icon: CreditCard,
  },
  {
    id: "current-plan",
    label: "Current plan",
    detail: "Subscription status and plan details",
    keywords: "settings billing subscription current plan status",
    href: `${ROUTES.settings}?section=billing#billing-title`,
    icon: CreditCard,
  },
  {
    id: "billing-plans",
    label: "Available plans",
    detail: "View subscription plan options",
    keywords: "settings billing subscription available plans pricing",
    href: `${ROUTES.settings}?section=billing#plans-title`,
    icon: CreditCard,
  },
  {
    id: "payment-method",
    label: "Payment method",
    detail: "Payment setup",
    keywords: "settings billing payment method card",
    href: `${ROUTES.settings}?section=billing#payment-title`,
    icon: CreditCard,
  },
  {
    id: "billing-information",
    label: "Billing information",
    detail: "Company name, billing email, and address",
    keywords: "settings billing information company email address",
    href: `${ROUTES.settings}?section=billing#billing-info-title`,
    icon: CreditCard,
  },
  {
    id: "billing-history",
    label: "Billing history",
    detail: "Invoices and receipts",
    keywords: "settings billing history invoices receipts",
    href: `${ROUTES.settings}?section=billing#history-title`,
    icon: CreditCard,
  },
];

export default function TopBarSearch({ role }: { role: string | null }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(
    () =>
      SEARCH_ITEMS.filter((item) => {
        if (role !== "owner" && item.id === "organization-settings")
          return false;
        if (
          role !== "owner" &&
          (item.id === "billing" || item.id.startsWith("billing-") ||
            item.id === "current-plan" ||
            item.id === "payment-method")
        )
          return false;
        if (role === "staff" && item.id === "reports") return false;
        return true;
      }),
    [role],
  );

  const results = useMemo(() => {
    const terms = query
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (terms.length === 0) return items.slice(0, 6);

    return items
      .map((item, index) => {
        const label = item.label.toLocaleLowerCase();
        const detail = item.detail.toLocaleLowerCase();
        const keywords = item.keywords.toLocaleLowerCase();
        const score = terms.reduce((total, term) => {
          if (label.startsWith(term)) return total;
          if (label.includes(term)) return total + 1;
          if (detail.includes(term)) return total + 2;
          if (keywords.includes(term)) return total + 3;
          return total + 100;
        }, 0);
        return { item, index, score };
      })
      .filter(({ score }) => score < 100)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map(({ item }) => item)
      .slice(0, 8);
  }, [items, query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function navigateTo(item: SearchItem) {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    router.push(item.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && open && results[activeIndex]) {
      event.preventDefault();
      navigateTo(results[activeIndex]);
    }
  }

  const listboxId = "topbar-search-results";

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.search}>
        <Search size={15} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search StockWise"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && results[activeIndex]
              ? `topbar-search-option-${results[activeIndex].id}`
              : undefined
          }
          placeholder="Search pages and settings..."
          className={styles.searchInput}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <kbd className={styles.shortcut}>Ctrl K</kbd>
      </label>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelLabel}>
            {query.trim() ? "Search results" : "Quick access"}
          </div>
          <ul
            id={listboxId}
            className={styles.results}
            role="listbox"
            aria-label="Search results"
          >
            {results.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.id} role="presentation">
                  <button
                    id={`topbar-search-option-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`${styles.result} ${index === activeIndex ? styles.resultActive : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateTo(item)}
                  >
                    <span className={styles.resultIcon}>
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className={styles.resultText}>
                      <span className={styles.resultLabel}>{item.label}</span>
                      <span className={styles.resultDetail}>{item.detail}</span>
                    </span>
                    {index === activeIndex && (
                      <span className={styles.enterHint}>Enter</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length === 0 && (
            <p className={styles.empty}>
              No pages or settings match “{query.trim()}”.
            </p>
          )}
          <div className={styles.footer}>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> to navigate
            </span>
            <span>
              <kbd>Enter</kbd> to open
            </span>
            <span>
              <kbd>Esc</kbd> to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
