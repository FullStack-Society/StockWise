"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Camera, X } from "lucide-react";
import { normalizeScannedUpc } from "@/lib/inventory/upc";
import styles from "@/styles/inventory/InventoryActions.module.css";

export default function UpcScannerButton({
  onScan,
}: {
  onScan: (upc: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    const video = videoRef.current;
    if (!video) return;

    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanSuccess: 700,
      delayBetweenScanAttempts: 200,
    });
    reader.possibleFormats = [BarcodeFormat.UPC_A, BarcodeFormat.EAN_13];
    void reader
      .decodeFromVideoDevice(undefined, video, (result) => {
        if (!result || stopped) return;
        const upc = normalizeScannedUpc(result.getText());
        if (!upc) {
          setMessage("That barcode is not a valid 12-digit UPC-A.");
          return;
        }
        onScanRef.current(upc);
        setOpen(false);
      })
      .then((controls) => {
        if (stopped) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => {
        setMessage("Camera access is unavailable. Allow access or type the UPC into the field.");
      });

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.upcScanButton}
        onClick={() => {
          setMessage("Point the camera at the product’s UPC-A barcode.");
          setOpen(true);
        }}
      >
        <Camera size={14} /> Scan UPC
      </button>
      {open && (
        <div className={styles.upcScannerOverlay} role="dialog" aria-modal="true" aria-label="Scan product UPC">
          <section className={styles.upcScannerModal}>
            <header>
              <div>
                <h3>Scan UPC-A barcode</h3>
                <p>Scanned digits will fill the UPC field.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close UPC scanner">
                <X size={17} />
              </button>
            </header>
            <video ref={videoRef} muted playsInline />
            <p role="status">{message}</p>
            <button type="button" className={styles.upcScannerCancel} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </section>
        </div>
      )}
    </>
  );
}
