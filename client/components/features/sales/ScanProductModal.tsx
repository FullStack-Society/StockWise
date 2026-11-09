"use client";

import type { FormEvent, RefObject } from "react";
import { X } from "lucide-react";
import styles from "@/styles/sales/SalesBrowser.module.css";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  message: string;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmitCode: (value: string) => void;
  onClose: () => void;
};

export default function ScanProductModal({
  videoRef,
  message,
  code,
  onCodeChange,
  onSubmitCode,
  onClose,
}: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitCode(code);
  }

  return (
    <div
      className={styles.scannerOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Scan product UPC"
    >
      <section className={styles.scannerModal}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Scan product UPC</h2>
            <span>Scan each UPC once; the camera resets for the next product.</span>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>
        <video ref={videoRef} className={styles.video} muted playsInline />
        {message && <p className={styles.scannerMessage} role="status">{message}</p>}
        <form className={styles.scanFallback} onSubmit={submit}>
          <label htmlFor="scan-upc">UPC fallback</label>
          <input
            id="scan-upc"
            autoFocus
            inputMode="numeric"
            maxLength={13}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder="Scan or enter 12-digit UPC"
          />
          <button type="submit">Add &amp; scan next</button>
        </form>
        <button type="button" className={styles.cancelScan} onClick={onClose}>
          Done scanning
        </button>
      </section>
    </div>
  );
}
