"use client";

import Image from "next/image";
import { QrCode, X } from "lucide-react";
import styles from "@/styles/sales/SalesBrowser.module.css";

type Props = {
  amount: string;
  merchantQr: string | null;
  error: string;
  isSaving: boolean;
  canComplete: boolean;
  onSaveQr: (file: File | undefined) => void;
  onClose: () => void;
  onComplete: () => void;
};

export default function MerchantPaymentModal({
  amount,
  merchantQr,
  error,
  isSaving,
  canComplete,
  onSaveQr,
  onClose,
  onComplete,
}: Props) {
  return (
    <div
      className={styles.scannerOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Customer QR payment"
    >
      <section className={styles.qrPaymentModal}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>QR payment</h2>
            <span>Ask the customer to scan your merchant QR</span>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close payment QR"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.paymentAmount}>{amount}</div>
        {merchantQr ? (
          <Image
            className={styles.merchantQr}
            src={merchantQr}
            alt="Merchant payment QR code"
            width={280}
            height={280}
            unoptimized
          />
        ) : (
          <div className={styles.merchantQrEmpty}>
            <QrCode size={36} />
            <span>Add your merchant QR image to this register.</span>
          </div>
        )}
        <label className={styles.uploadQr}>
          {merchantQr ? "Replace merchant QR image" : "Upload merchant QR image"}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              onSaveQr(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.scannerMessage}>
          StockWise does not process or verify this payment. Confirm that the
          payment arrived in your provider app before recording the sale. The
          QR image is saved on this browser and register only.
        </p>
        <button
          type="button"
          className={styles.completeButton}
          disabled={!canComplete || isSaving}
          onClick={onComplete}
        >
          {isSaving
            ? "Recording sale…"
            : "I confirmed payment · record sale"}
        </button>
      </section>
    </div>
  );
}
