"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/app/routes";
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
    id: "reports",
    label: "Reports",
    detail: "Inventory reports and trends",
    keywords: "analytics charts movement export sales",
    href: ROUTES.reports,
    icon: BarChart3,
  },
  {
    id: "users",
    label: "Users & permissions",
    detail: "Manage team members, roles, and invitations",
    keywords:
      "team members staff admin owner invite invitations access roles permissions",
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
    label: "Organization settings",
    detail: "Rename and manage your organization",
    keywords: "settings company workspace organization name",
    href: `${ROUTES.settings}?section=organization`,
    icon: Building2,
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
    keywords: "settings notification notifications timezone email alerts",
    href: `${ROUTES.settings}?section=preferences`,
    icon: SlidersHorizontal,
  },
  {
    id: "billing",
    label: "Billing & subscription",
    detail: "Subscription details",
    keywords: "settings billing subscription plan payment",
    href: `${ROUTES.settings}?section=billing`,
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
        if (role !== "owner" && item.id === "billing") return false;
        if (role === "staff" && item.id === "reports") return false;
        return true;
      }),
    [role],
  );

  const results = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
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
    setActiveIndex(0);
  }, [query]);

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
