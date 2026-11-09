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
  const date = parseDate(value);
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

export function formatDateTime(
  value: string | Date,
  format: DateFormat,
  timeZone: string,
) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale =
    format === "dmy" ? "en-GB" : format === "ymd" ? "sv-SE" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

export function formatDateKey(value: string | Date, timeZone: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDate(value: string | Date) {
  if (value instanceof Date) return value;
  const normalized = value.replace(" ", "T");
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return new Date(
    !hasTimezone && normalized.includes("T")
      ? `${normalized}Z`
      : normalized,
  );
}
