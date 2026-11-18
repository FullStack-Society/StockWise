/** StockWise barcode values are 12 digits; some printed labels have nonstandard check digits. */
export function isUpcA(value: string): boolean {
  return /^\d{12}$/.test(value);
}

/** UPC scanners may report a UPC-A as a 13-digit EAN with a leading zero. */
export function normalizeScannedUpc(value: string): string | null {
  const digits = value.trim().replace(/\D/g, "");
  const upc = digits.length === 13 && digits.startsWith("0")
    ? digits.slice(1)
    : digits;
  return isUpcA(upc) ? upc : null;
}
