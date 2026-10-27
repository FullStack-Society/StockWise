"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileUp, X } from "lucide-react";
import { importProductsAction } from "@/lib/inventory/actions";
import { parseProducts, type ParseResult } from "@/lib/inventory/csv-import";
import type { Category } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryActions.module.css";
import extra from "@/styles/modals/inventory/ImportModal.module.css";
import buttons from "@/styles/inventory/InventoryHeader.module.css";

type Props = {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
};

function downloadTemplate() {
  const blob = new Blob(
    ["Product Name,SKU,Category,Description,Price,Quantity,Minimum Stock\r\n"],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stockwise-inventory-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImportModal({
  categories,
  onClose,
  onImported,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParseResult>({ rows: [], issues: [] });
  const [error, setError] = useState("");
  const [result, setResult] = useState<ParseResult["issues"]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParsed({ rows: [], issues: [] });
    setResult([]);
    setImportedCount(0);
    setError("");
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file. Excel files aren’t supported yet.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a CSV smaller than 5 MB.");
      return;
    }
    try {
      setParsed(parseProducts(await file.text(), categories));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not read this CSV file.",
      );
    }
  }

  function startImport() {
    setError("");
    startTransition(async () => {
      const response = await importProductsAction(parsed.rows);
      setImportedCount(response.imported);
      setResult(
        [...parsed.issues, ...response.failures].sort((a, b) => a.row - b.row),
      );
      if (response.imported > 0) onImported();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="import-inventory-title"
      onClose={onClose}
      onClick={(event) =>
        event.target === event.currentTarget && dialogRef.current?.close()
      }
    >
      <div className={styles.modalBody}>
        <header className={styles.modalHeader}>
          <div>
            <h2 id="import-inventory-title" className={styles.modalTitle}>
              Import inventory
            </h2>
            <p className={styles.modalSubtitle}>
              Upload a CSV to add products to this organization.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close import"
          >
            <X size={15} />
          </button>
        </header>

        <div className={extra.fileRow}>
          <label className={extra.filePicker}>
            <FileUp size={15} aria-hidden />
            <span>{fileName || "Choose CSV file"}</span>
            <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
          </label>
          <button
            type="button"
            className={extra.templateButton}
            onClick={downloadTemplate}
          >
            <Download size={13} aria-hidden /> Download template
          </button>
        </div>

        <p className={extra.help}>
          Required columns: Product Name and SKU. Optional columns: Category,
          Description, Price, Quantity, and Minimum Stock. Category names must
          match this organization’s categories.
        </p>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        {parsed.rows.length > 0 && (
          <div className={extra.summary}>
            <strong>{parsed.rows.length} ready to import</strong>
            {parsed.issues.length > 0 && (
              <span>
                {parsed.issues.length} row(s) need attention and will be
                skipped.
              </span>
            )}
          </div>
        )}
        {importedCount > 0 && (
          <p className={extra.success} role="status">
            Imported {importedCount} product{importedCount === 1 ? "" : "s"}.
          </p>
        )}
        {result.length > 0 && (
          <div className={extra.issues} role="status">
            <strong>Rows to review</strong>
            <ul>
              {result.slice(0, 8).map((issue) => (
                <li key={`${issue.row}-${issue.error}`}>
                  Row {issue.row}: {issue.error}
                </li>
              ))}
            </ul>
            {result.length > 8 && <p>{result.length - 8} more row issue(s).</p>}
          </div>
        )}

        <footer className={styles.actions}>
          <button
            type="button"
            className={buttons.button}
            onClick={() => dialogRef.current?.close()}
          >
            {importedCount || result.length ? "Done" : "Cancel"}
          </button>
          <button
            type="button"
            className={`${buttons.button} ${buttons.buttonPrimary}`}
            disabled={isPending || parsed.rows.length === 0}
            onClick={startImport}
          >
            {isPending
              ? "Importing…"
              : `Import ${parsed.rows.length || "products"}`}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
