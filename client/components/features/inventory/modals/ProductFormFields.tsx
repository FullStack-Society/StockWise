import type { Category, Product } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryActions.module.css";

type Props = {
  product: Product | null;
  categories: Category[];
  errors: Record<string, string>;
};

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={`product-${name}`} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`product-${name}-error`}
          role="alert"
          className={styles.fieldError}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProductFormFields({
  product,
  categories,
  errors,
}: Props) {
  const isEdit = product !== null;
  const inputProps = (name: string) => ({
    id: `product-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `product-${name}-error` : undefined,
  });
  const cls = (base: string, name: string) =>
    `${base} ${errors[name] ? styles.invalid : ""}`;

  return (
    <>
      {isEdit && <input type="hidden" name="id" value={product.id} />}
      <Field label="Product name" name="name" error={errors.name}>
        <input
          {...inputProps("name")}
          defaultValue={product?.name ?? ""}
          maxLength={200}
          autoFocus
          className={cls(styles.input, "name")}
        />
      </Field>
      <div className={styles.row2}>
        <Field label="SKU" name="sku" error={errors.sku}>
          <input
            {...inputProps("sku")}
            defaultValue={product?.sku ?? ""}
            maxLength={100}
            className={cls(styles.input, "sku")}
          />
        </Field>
        <Field label="Category" name="categoryId" error={errors.categoryId}>
          <select
            {...inputProps("categoryId")}
            defaultValue={product?.categoryId ?? ""}
            className={cls(
              `${styles.select} ${styles.categorySelect}`,
              "categoryId",
            )}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description" name="description" error={errors.description}>
        <textarea
          {...inputProps("description")}
          defaultValue={product?.description ?? ""}
          maxLength={1000}
          className={cls(styles.textarea, "description")}
        />
      </Field>
      <div className={styles.row2}>
        <Field label="Unit price (USD)" name="price" error={errors.price}>
          <input
            {...inputProps("price")}
            defaultValue={product ? product.price.toFixed(2) : "0"}
            inputMode="decimal"
            className={cls(styles.input, "price")}
          />
        </Field>
        {isEdit ? (
          <div className={styles.field}>
            <span className={styles.label}>Quantity</span>
            <input type="hidden" name="quantity" value={product.quantity} />
            <p className={styles.readonlyValue}>{product.quantity}</p>
          </div>
        ) : (
          <Field
            label="Starting quantity"
            name="quantity"
            error={errors.quantity}
          >
            <input
              {...inputProps("quantity")}
              defaultValue="0"
              inputMode="numeric"
              className={cls(styles.input, "quantity")}
            />
          </Field>
        )}
      </div>
      {isEdit && (
        <p className={styles.hint}>
          To change the quantity, use a stock adjustment (stock in / stock out).
        </p>
      )}
    </>
  );
}
