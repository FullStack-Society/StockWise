import { ChevronDown, Search } from "lucide-react";
import {
  CATEGORIES,
  STATUS_OPTIONS,
  SUPPLIERS,
} from "@/lib/mock-data/inventory";
import styles from "@/styles/inventory/FilterBar.module.css";

export type Filters = {
  query: string;
  category: string;
  status: string;
  supplier: string;
};
export const EMPTY_FILTERS: Filters = {
  query: "",
  category: "",
  status: "",
  supplier: "",
};

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
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

const asOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

export default function FilterBar({ filters, onChange, onClear }: Props) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        <Search size={14} />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search by product or barcode"
          className={styles.searchInput}
        />
      </label>

      <Select
        label="Category"
        value={filters.category}
        options={asOptions(CATEGORIES)}
        onChange={(category) => onChange({ category })}
      />
      <Select
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(status) => onChange({ status })}
      />
      <Select
        label="Supplier"
        value={filters.supplier}
        options={asOptions(SUPPLIERS)}
        onChange={(supplier) => onChange({ supplier })}
      />

      <button type="button" onClick={onClear} className={styles.clear}>
        Clear filters
      </button>
    </div>
  );
}
