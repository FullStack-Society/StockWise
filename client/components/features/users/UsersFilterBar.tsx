import { Search } from "lucide-react";
import { ROLES } from "@/lib/auth/roles";
import styles from "@/styles/users/UsersFilterBar.module.css";

type Props = {
  search: string;
  role: string;
  onSearch: (v: string) => void;
  onRole: (v: string) => void;
  onClear: () => void;
};

export default function UsersFilterBar({
  search,
  role,
  onSearch,
  onRole,
  onClear,
}: Props) {
  return (
    <div className={styles.filterBar}>
      <label className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} aria-hidden />
        <input
          className={styles.searchInput}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search users"
        />
      </label>
      <select
        className={styles.select}
        value={role}
        onChange={(e) => onRole(e.target.value)}
        aria-label="Filter by role"
      >
        <option value="">All roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button type="button" className={styles.clearBtn} onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
