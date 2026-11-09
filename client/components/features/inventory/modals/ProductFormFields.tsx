"use client";

import { useState } from "react";
import type { Category, Product } from "@/lib/inventory/types";
import { normalizeScannedUpc } from "@/lib/inventory/upc";
import styles from "@/styles/inventory/InventoryActions.module.css";
import UpcScannerButton from "./UpcScannerButton";

type Props = {
  product: Product | null;
  categories: Category[];
  defaultReorderPoint: number;
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
  defaultReorderPoint,
  errors,
}: Props) {
  const isEdit = product !== null;
  const [upc, setUpc] = useState(product?.upc ?? "");
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
      <section className={styles.formSection} aria-labelledby="product-details-heading">
        <h3 id="product-details-heading" className={styles.sectionTitle}>Product details</h3>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldFull}>
            <Field label="Product name" name="name" error={errors.name}>
              <input
                {...inputProps("name")}
                defaultValue={product?.name ?? ""}
                maxLength={200}
                autoFocus
                className={cls(styles.input, "name")}
              />
            </Field>
          </div>
          <Field label="Category" name="categoryId" error={errors.categoryId}>
            <select
              {...inputProps("categoryId")}
              defaultValue={product?.categoryId ?? ""}
              className={cls(`${styles.select} ${styles.categorySelect}`, "categoryId")}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Variant (optional)" name="variant" error={errors.variant}>
            <input
              {...inputProps("variant")}
              defaultValue={product?.variant ?? ""}
              maxLength={200}
              placeholder="Size, color, pack…"
              className={cls(styles.input, "variant")}
            />
          </Field>
          <div className={styles.fieldFull}>
            <Field label="Description (optional)" name="description" error={errors.description}>
              <textarea
                {...inputProps("description")}
                defaultValue={product?.description ?? ""}
                maxLength={1000}
                className={cls(styles.textarea, "description")}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="product-identifiers-heading">
        <h3 id="product-identifiers-heading" className={styles.sectionTitle}>Product identifiers</h3>
        <div className={styles.fieldGrid}>
        <Field label="SKU" name="sku" error={errors.sku}>
          <input
            {...inputProps("sku")}
            defaultValue={product?.sku ?? ""}
            maxLength={100}
            className={cls(styles.input, "sku")}
          />
        </Field>
        <Field label="UPC-A barcode (optional)" name="upc" error={errors.upc}>
          <div className={styles.upcFieldControl}>
            <input
              {...inputProps("upc")}
              value={upc}
              onChange={(event) => {
                const entered = event.target.value.replace(/\D/g, "").slice(0, 13);
                setUpc(entered.length === 13 ? normalizeScannedUpc(entered) ?? entered : entered);
              }}
              inputMode="numeric"
              maxLength={13}
              placeholder="12-digit UPC-A"
              className={cls(styles.input, "upc")}
            />
            <UpcScannerButton onScan={setUpc} />
          </div>
        </Field>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="product-pricing-heading">
        <h3 id="product-pricing-heading" className={styles.sectionTitle}>Pricing and stock</h3>
        <div className={styles.fieldGrid}>
          <Field label="Selling price (USD)" name="price" error={errors.price}>
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
          <div className={styles.fieldFull}>
            <Field label="Reorder when quantity reaches" name="reorderPoint" error={errors.reorderPoint}>
              <input
                {...inputProps("reorderPoint")}
                defaultValue={String(product?.reorderPoint ?? defaultReorderPoint)}
                inputMode="numeric"
                className={cls(styles.input, "reorderPoint")}
              />
            </Field>
          </div>
        </div>
      </section>
      {isEdit && (
        <p className={styles.hint}>
          To change the quantity, use a stock adjustment (stock in / stock out).
        </p>
      )}
    </>
  );
}
