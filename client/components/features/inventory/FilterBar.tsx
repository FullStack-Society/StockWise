import { ChevronDown, Search } from "lucide-react";
import { STATUS_OPTIONS } from "@/lib/inventory/constants";
import type { Category } from "@/lib/inventory/types";
import styles from "@/styles/inventory/FilterBar.module.css";

type Props = {
  query: string;
  category: string;
  status: string;
  categories: Category[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClear: () => void;
};

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.selectWrap}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.select}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

export default function FilterBar({
  query,
  category,
  status,
  categories,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onClear,
}: Props) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        <Search size={14} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by product name or SKU"
          className={styles.searchInput}
        />
      </label>

      <Select
        label="Category"
        value={category}
        options={categories.map((c) => ({
          value: String(c.id),
          label: c.name,
        }))}
        onChange={onCategoryChange}
      />
      <Select
        label="Status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={onStatusChange}
      />

      <button type="button" onClick={onClear} className={styles.clear}>
        Clear filters
      </button>
    </div>
  );
}
