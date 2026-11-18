import styles from "@/styles/ui/Pagination.module.css";

type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, pageCount, onChange }: Props) {
  const count = Math.max(pageCount, 1);
  const current = Math.min(Math.max(page, 1), count);
  const start = Math.max(2, current - 2);
  const end = Math.min(count - 1, current + 2);
  const pages = new Set<number>([1, count]);
  for (let number = start; number <= end; number++) pages.add(number);
  const pageItems: Array<number | "start-gap" | "end-gap"> = [];
  [...pages].sort((left, right) => left - right).forEach((number, index, all) => {
    if (index > 0 && number - all[index - 1] > 1) {
      pageItems.push(number - all[index - 1] === 2 ? all[index - 1] + 1 :
        (number === count ? "end-gap" : "start-gap"));
    }
    pageItems.push(number);
  });
  return (
    <nav className={styles.pager} aria-label="Pagination">
      <button
        type="button"
        className={styles.pageButton}
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        Prev
      </button>

      {pageItems.map((item, index) => typeof item === "number" ? (
        <button
          key={item}
          type="button"
          aria-current={item === current ? "page" : undefined}
          className={`${styles.pageButton} ${item === current ? styles.pageActive : ""}`}
          onClick={() => onChange(item)}
        >{item}</button>
      ) : (
        <span key={`${item}-${index}`} className={styles.pageButton} aria-hidden="true">…</span>
      ))}

      <button
        type="button"
        className={styles.pageButton}
        disabled={current >= count}
        onClick={() => onChange(current + 1)}
      >
        Next
      </button>
    </nav>
  );
}
