export type CurrencyCode = "USD" | "PHP" | "EUR";
export type DateFormat = "mdy" | "dmy" | "ymd";
export type CurrencyRates = Record<CurrencyCode, number>;

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: "en-US",
  PHP: "en-PH",
  EUR: "de-DE",
};

export function formatPreferredCurrency(
  value: number,
  currency: CurrencyCode,
  rates: CurrencyRates | null,
) {
  if (currency === "USD") return formatCurrency(value, "USD");
  if (!rates) return "—";
  return formatCurrency(value * rates[currency], currency);
}

export function formatCurrency(value: number, currency: CurrencyCode = "USD") {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(
  value: string | Date,
  format: DateFormat = "mdy",
) {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    const normalized = value.replace(" ", "T");
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    date = new Date(
      !hasTimezone && normalized.includes("T")
        ? `${normalized}Z`
        : normalized,
    );
  }
  if (Number.isNaN(date.getTime())) return "—";
  const parts: Record<string, string> = {
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
    year: String(date.getUTCFullYear()),
  };
  if (format === "dmy") return `${parts.day}/${parts.month}/${parts.year}`;
  if (format === "ymd") return `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.month}/${parts.day}/${parts.year}`;
}
