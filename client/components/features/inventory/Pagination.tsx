import styles from "@/styles/inventory/Pagination.module.css";

type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, pageCount, onChange }: Props) {
  return (
    <nav className={styles.pager} aria-label="Pagination">
      <button
        type="button"
        className={styles.pageButton}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>

      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          className={`${styles.pageButton} ${n === page ? styles.pageActive : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        className={styles.pageButton}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
