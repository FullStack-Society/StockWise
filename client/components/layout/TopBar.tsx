import { Bell, Search, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import styles from "@/styles/layout/TopBar.module.css";

export default async function Topbar() {
  const user = await getSession();

  return (
    <header className={styles.topbar}>
      <label className={styles.search}>
        <Search size={14} />
        <input
          type="search"
          placeholder="Search products, SKU..."
          className={styles.searchInput}
        />
      </label>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.bell}
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className={styles.bellDot} />
        </button>

        <div className={styles.user}>
          <div className={styles.avatar}>
            <UserRound size={18} />
          </div>
          <div className={styles.userText}>
            <p className={styles.userName}>{user?.name}</p>
            <p className={styles.userRole}>{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
