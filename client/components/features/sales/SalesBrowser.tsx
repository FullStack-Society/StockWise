"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Camera, Minus, Plus, Search, ShoppingCart } from "lucide-react";
import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import MerchantPaymentModal from "./MerchantPaymentModal";
import ProductBarcodeModal from "./ProductBarcodeModal";
import ScanProductModal from "./ScanProductModal";
import type { Product, InventoryMovement } from "@/lib/inventory/types";
import { normalizeScannedUpc } from "@/lib/inventory/upc";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { formatDateTime, formatPreferredCurrency } from "@/lib/utils/format";
import {
  checkoutSaleAction,
  getMerchantQrAction,
  saveMerchantQrAction,
} from "@/lib/sales/actions";
import styles from "@/styles/sales/SalesBrowser.module.css";

type Props = {
  organizationId: number;
  canManageMerchantQr: boolean;
  products: Product[];
  recentSales: InventoryMovement[];
};

export default function SalesBrowser({
  organizationId,
  canManageMerchantQr,
  products,
  recentSales,
}: Props) {
  const router = useRouter();
  const { currency, currencyRates, date_format, timezone } = useUserPreferences();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr">("cash");
  const [externalCardPaymentConfirmed, setExternalCardPaymentConfirmed] = useState(false);
  const [qrPaymentOpen, setQrPaymentOpen] = useState(false);
  const [merchantQr, setMerchantQr] = useState<string | null>(null);
  const [merchantQrError, setMerchantQrError] = useState("");
  const [merchantQrLoading, setMerchantQrLoading] = useState(true);
  const [merchantQrSaved, setMerchantQrSaved] = useState(false);
  const [scannerCode, setScannerCode] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerCycle, setScannerCycle] = useState(0);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [scannerMessage, setScannerMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedCodeRef = useRef("");
  const scanLockedRef = useRef(false);
  const saleIdRef = useRef<{ id: string; signature: string } | null>(null);
  const totalQuantity = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const lines = useMemo(
    () => products.filter((product) => cart[product.id]).map((product) => ({
      product,
      quantity: cart[product.id],
      lineTotal: product.price * cart[product.id],
    })),
    [cart, products],
  );
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const visibleProducts = products
    .filter((product) => product.quantity > 0)
    .filter((product) => `${product.name} ${product.sku} ${product.upc ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 40);

  useEffect(() => {
    let cancelled = false;
    const loadMerchantQr = async () => {
      setMerchantQrLoading(true);
      const result = await getMerchantQrAction();
      if (cancelled) return;
      if (!result.ok) {
        setMerchantQrError(result.error);
        setMerchantQrLoading(false);
        return;
      }
      if (result.imageData) {
        setMerchantQr(result.imageData);
        setMerchantQrLoading(false);
        return;
      }

      // Migrate a QR previously saved in this browser into shared storage.
      const legacyKey = `stockwise-sales-merchant-qr-${organizationId}`;
      let legacyImage: string | null = null;
      try {
        legacyImage = window.localStorage.getItem(legacyKey);
      } catch {
        // Ignore unavailable browser storage; a manager can upload the image again.
      }
      if (
        legacyImage &&
        legacyImage.length <= 2_100_000 &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
          legacyImage,
        )
      ) {
        setMerchantQr(legacyImage);
        const migration = await saveMerchantQrAction(legacyImage);
        if (cancelled) return;
        if (migration.ok) {
          try {
            window.localStorage.removeItem(legacyKey);
          } catch {
            // The shared copy is saved; a leftover local copy is harmless.
          }
        } else {
          setMerchantQrError(migration.error);
        }
      }
      setMerchantQrLoading(false);
    };

    void loadMerchantQr();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!qrPaymentOpen) return;
    let cancelled = false;
    void getMerchantQrAction().then((result) => {
      if (cancelled) return;
      if (result.ok && result.imageData) setMerchantQr(result.imageData);
      else if (!result.ok) setMerchantQrError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, qrPaymentOpen]);

  const addProduct = useCallback((product: Product) => {
    setCart((current) => ({
      ...current,
      [product.id]: Math.min(product.quantity, (current[product.id] ?? 0) + 1),
    }));
    setError("");
    setExternalCardPaymentConfirmed(false);
    if (paymentMethod === "qr" && !scannerOpen) setQrPaymentOpen(true);
  }, [paymentMethod, scannerOpen]);

  const addScannedUpc = useCallback((value: string) => {
    const upc = normalizeScannedUpc(value);
    const product = upc
      ? products.find((item) => item.upc === upc)
      : undefined;
    if (!product || product.quantity < 1) {
      setScannerMessage("No in-stock product matches that UPC. Check the product’s UPC in Inventory.");
      return false;
    }
    addProduct(product);
    setSearch("");
    setScannerCode("");
    setScannerMessage(`${product.name} added to the sale.`);
    return true;
  }, [addProduct, products]);

  useEffect(() => {
    if (!scannerOpen && !barcodeProduct && !qrPaymentOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (qrPaymentOpen) setQrPaymentOpen(false);
      else if (barcodeProduct) setBarcodeProduct(null);
      else setScannerOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [barcodeProduct, qrPaymentOpen, scannerOpen]);

  useEffect(() => {
    if (!scannerOpen) return;
    let stopped = false;
    const scan = async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanSuccess: 800,
          delayBetweenScanAttempts: 200,
        });
        reader.possibleFormats = [BarcodeFormat.UPC_A, BarcodeFormat.EAN_13];
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!result || stopped) return;
            const code = result.getText().trim();
            if (scanLockedRef.current || code === lastScannedCodeRef.current) return;
            scanLockedRef.current = true;
            lastScannedCodeRef.current = code;
            if (addScannedUpc(code)) {
              setScannerMessage("Product added. Ready for the next UPC…");
              setScannerCycle((current) => current + 1);
            } else {
              scanLockedRef.current = false;
            }
          },
        );
        if (stopped) controls.stop();
        else scannerControlsRef.current = controls;
      } catch {
        setScannerMessage("Camera access was blocked or is unavailable. Allow camera access, use a USB barcode scanner, or enter the UPC below.");
      }
    };
    scanLockedRef.current = false;
    void scan();
    return () => {
      stopped = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [addScannedUpc, scannerCycle, scannerOpen]);

  const saveMerchantQr = async (file: File | undefined) => {
    if (!file) return;
    setMerchantQrError("");
    setMerchantQrSaved(false);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMerchantQrError("Choose a PNG, JPEG, or WebP image containing your merchant payment QR.");
      return;
    }
    if (file.size > 1_500_000) {
      setMerchantQrError("Choose an image smaller than 1.5 MB.");
      return;
    }
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Could not read that QR image."));
        reader.onerror = () => reject(new Error("Could not read that QR image."));
        reader.readAsDataURL(file);
      });
      const result = await saveMerchantQrAction(image);
      if (!result.ok) {
        setMerchantQrError(result.error);
        return;
      }
      setMerchantQr(image);
      setMerchantQrSaved(true);
    } catch {
      setMerchantQrError("Could not save this QR. Try the upload again.");
    }
  };

  const submitSale = async () => {
    if (!lines.length || isSaving) return;
    setIsSaving(true);
    setError("");
    const signature = JSON.stringify({
      paymentMethod,
      items: lines
        .map(({ product, quantity }) => ({ productId: product.id, quantity }))
        .sort((first, second) => first.productId - second.productId),
    });
    const pendingAttempt = saleIdRef.current;
    const saleId =
      pendingAttempt?.signature === signature
        ? pendingAttempt.id
        : crypto.randomUUID();
    saleIdRef.current = { id: saleId, signature };
    try {
      const result = await checkoutSaleAction({
        saleId,
        paymentMethod,
        items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      });
      if (!result.ok) { setError(result.error); return; }
      saleIdRef.current = null;
      setCart({});
      setSearch("");
      setPaymentMethod("cash");
      setExternalCardPaymentConfirmed(false);
      router.refresh();
    } catch {
      setError("Could not complete this sale. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  function addManualScan(value: string) {
    if (!addScannedUpc(value)) return;
    setScannerCode("");
    setScannerMessage("Product added. Ready for the next UPC…");
    setScannerCycle((current) => current + 1);
  }

  function completeQrPayment() {
    setQrPaymentOpen(false);
    void submitSale();
  }

  const money = (value: number) => formatPreferredCurrency(value, currency, currencyRates);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>POINT OF SALE</p><h1>Sales</h1><p className={styles.subtitle}>Scan or search inventory, collect payment, then record the sale. Card and QR payments are confirmed outside StockWise.</p></div>
        <div className={styles.headerMetric}><ShoppingCart size={18} /><span>{totalQuantity} {totalQuantity === 1 ? "item" : "items"}</span></div>
      </header>

      <div className={styles.columns}>
        <section className={styles.catalog} aria-label="Product catalog">
          <div className={styles.catalogToolbar}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const term = search.trim();
                  const normalizedUpc = normalizeScannedUpc(term);
                  const product = products.find(
                    (item) =>
                      (item.sku.toLowerCase() === term.toLowerCase() ||
                        (normalizedUpc !== null && item.upc === normalizedUpc)) &&
                      item.quantity > 0,
                  );
                  if (product) {
                    addProduct(product);
                    setSearch("");
                  }
                }}
                placeholder="Search product, SKU, or UPC"
              />
            </label>
            <button
              type="button"
              className={styles.scanButton}
              onClick={() => {
                setScannerCode("");
                lastScannedCodeRef.current = "";
                setScannerMessage("Point the camera at the product’s UPC barcode, or enter its UPC below.");
                setScannerOpen(true);
              }}
            >
              <Camera size={16} /> Scan UPC
            </button>
          </div>
          <div className={styles.products}>
            {visibleProducts.map((product) => (
              <div className={styles.productRow} key={product.id}>
                <button
                  type="button"
                  className={styles.product}
                  onClick={() => addProduct(product)}
                >
                  <span className={styles.productIcon}><ShoppingCart size={17} /></span>
                  <span className={styles.productDetails}>
                    <strong>{product.name}</strong>
                    <small>{product.sku} · {product.quantity} available</small>
                  </span>
                  <span className={styles.productPrice}>{money(product.price)}</span>
                  <Plus size={16} className={styles.addIcon} />
                </button>
                <button
                  type="button"
                  className={styles.productQr}
                  aria-label={product.upc ? `Show UPC barcode for ${product.name}` : `${product.name} has no UPC barcode`}
                  title={product.upc ? "Show and print UPC barcode" : "Add a UPC in Inventory to scan this product"}
                  disabled={!product.upc}
                  onClick={() => setBarcodeProduct(product)}
                >
                  <Barcode size={15} />
                </button>
              </div>
            ))}
            {visibleProducts.length === 0 && (
              <p className={styles.empty}>No in-stock products match that search.</p>
            )}
          </div>
        </section>

        <section className={styles.checkout} aria-label="Current sale">
          <div className={styles.sectionHeading}>
            <div>
              <h2>Current sale</h2>
              <span>{lines.length} product {lines.length === 1 ? "line" : "lines"}</span>
            </div>
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setCart({});
                setExternalCardPaymentConfirmed(false);
              }}
              disabled={!lines.length}
            >
              Clear
            </button>
          </div>
          <div className={styles.cart}>
            {lines.map(({ product, quantity, lineTotal }) => (
              <div className={styles.cartLine} key={product.id}>
                <div className={styles.cartInfo}>
                  <strong>{product.name}</strong>
                  <small>{money(product.price)} each</small>
                </div>
                <div className={styles.quantity}>
                  <button
                    type="button"
                    aria-label={`Remove one ${product.name}`}
                    onClick={() => {
                      setExternalCardPaymentConfirmed(false);
                      setCart((current) => {
                        const next = { ...current };
                        if (next[product.id] <= 1) delete next[product.id];
                        else next[product.id] -= 1;
                        return next;
                      });
                    }}
                  >
                    <Minus size={13} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${product.name}`}
                    disabled={quantity >= product.quantity}
                    onClick={() => addProduct(product)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <strong className={styles.lineTotal}>{money(lineTotal)}</strong>
              </div>
            ))}
            {!lines.length && (
              <p className={styles.emptyCart}>Choose products from the catalog to start a sale.</p>
            )}
          </div>
          <div className={styles.payment}>
            <label htmlFor="payment-method">Payment method</label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(event) => {
                const next = event.target.value as typeof paymentMethod;
                if (next === "qr" && !lines.length) {
                  setError("Add products before opening QR checkout.");
                  return;
                }
                setPaymentMethod(next);
                setExternalCardPaymentConfirmed(false);
                if (next === "qr") {
                  setMerchantQrError("");
                  setQrPaymentOpen(true);
                }
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card · confirm on terminal</option>
              <option value="qr">QR / e-wallet · confirm in provider app</option>
            </select>
          </div>
          {paymentMethod === "card" && (
            <label className={styles.paymentNote}>
              <input
                type="checkbox"
                checked={externalCardPaymentConfirmed}
                onChange={(event) =>
                  setExternalCardPaymentConfirmed(event.target.checked)
                }
              />
              <span>
                StockWise does not process or verify card payments. Confirm the
                payment on your terminal before recording this sale and
                deducting stock.
              </span>
            </label>
          )}
          {paymentMethod === "qr" && (
            <div className={styles.paymentNote}>
              <span>
                StockWise does not process or verify QR payments. Confirm
                receipt in your provider app before recording the sale and
                deducting stock.
              </span>
              <button type="button" onClick={() => setQrPaymentOpen(true)}>
                Show merchant QR
              </button>
            </div>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.total}>
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            type="button"
            className={styles.completeButton}
            disabled={
              !lines.length ||
              isSaving ||
              (paymentMethod === "card" && !externalCardPaymentConfirmed)
            }
            onClick={() =>
              paymentMethod === "qr"
                ? setQrPaymentOpen(true)
                : void submitSale()
            }
          >
            {isSaving
              ? "Recording sale…"
              : paymentMethod === "card"
                ? "Record confirmed card payment"
                : paymentMethod === "qr"
                  ? "Open QR payment window"
                  : "Complete cash sale"}
          </button>
          <p className={styles.stockNote}>Completing a sale immediately deducts the sold quantities from inventory.</p>
        </section>
      </div>

      <section className={styles.recent} aria-label="Recently sold products">
        <div className={styles.sectionHeading}>
          <div>
            <h2>Recently sold</h2>
            <span>Latest recorded sales</span>
          </div>
        </div>
        {recentSales.length ? (
          <div className={styles.recentList}>
            {recentSales.slice(0, 10).map((sale) => {
              const payment = sale.remarks?.match(/payment:(cash|card|qr)/)?.[1] ?? "cash";
              return (
                <article className={styles.recentItem} key={sale.id}>
                  <div>
                    <strong>{sale.productName}</strong>
                    <small>{sale.sku} · {formatDateTime(sale.occurredAt, date_format, timezone)}</small>
                  </div>
                  <span className={styles.paymentTag}>
                    {payment === "qr" ? "QR / e-wallet" : payment === "card" ? "Card" : "Cash"}
                  </span>
                  <strong className={styles.soldQuantity}>−{sale.quantity}</strong>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyRecent}>Completed sales will appear here.</p>
        )}
      </section>

      {scannerOpen && (
        <ScanProductModal
          videoRef={videoRef}
          message={scannerMessage}
          code={scannerCode}
          onCodeChange={setScannerCode}
          onSubmitCode={addManualScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {barcodeProduct && (
        <ProductBarcodeModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
        />
      )}
      {qrPaymentOpen && (
        <MerchantPaymentModal
          amount={money(total)}
          merchantQr={merchantQr}
          error={merchantQrError}
          isLoading={merchantQrLoading}
          saved={merchantQrSaved}
          canManageQr={canManageMerchantQr}
          isSaving={isSaving}
          canComplete={Boolean(merchantQr && lines.length)}
          onSaveQr={saveMerchantQr}
          onClose={() => setQrPaymentOpen(false)}
          onComplete={completeQrPayment}
        />
      )}
    </div>
  );
}
