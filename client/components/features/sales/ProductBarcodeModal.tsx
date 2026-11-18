"use client";

import { X } from "lucide-react";
import type { Product } from "@/lib/inventory/types";
import UpcBarcode from "./UpcBarcode";
import styles from "@/styles/sales/SalesBrowser.module.css";

export default function ProductBarcodeModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.scannerOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Product UPC barcode"
    >
      <section className={`stockwise-print-barcode ${styles.qrModal}`}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>{product.name}</h2>
            <span>Print this UPC-A barcode and scan it at checkout</span>
          </div>
          <button
            type="button"
            className={`${styles.iconButton} stockwise-print-hide`}
            onClick={onClose}
            aria-label="Close barcode"
          >
            <X size={18} />
          </button>
        </div>
        {product.upc && <UpcBarcode value={product.upc} />}
        <strong>{product.upc}</strong>
        <button type="button" className={`${styles.cancelScan} stockwise-print-hide`} onClick={() => window.print()}>
          Print label
        </button>
        <button type="button" className={`${styles.cancelScan} stockwise-print-hide`} onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}
