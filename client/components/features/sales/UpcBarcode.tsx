import styles from "@/styles/sales/SalesBrowser.module.css";

const LEFT_PATTERNS = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];
const RIGHT_PATTERNS = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];

export default function UpcBarcode({ value }: { value: string }) {
  if (!/^\d{12}$/.test(value)) {
    return (
      <p className={styles.barcodeWarning} role="alert">
        This is not a 12-digit UPC-A. Use the UPC fallback field to look up the
        product.
      </p>
    );
  }

  const digits = value.split("").map(Number);
  const weightedSum = digits
    .slice(0, 11)
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expectedCheckDigit = (10 - (weightedSum % 10)) % 10;
  if (digits[11] !== expectedCheckDigit) {
    return (
      <p className={styles.barcodeWarning} role="alert">
        This UPC-A has an invalid check digit. Use the UPC fallback field to
        look up the product.
      </p>
    );
  }

  const modules = [
    "101",
    ...digits.slice(0, 6).map((digit) => LEFT_PATTERNS[digit]),
    "01010",
    ...digits.slice(6).map((digit) => RIGHT_PATTERNS[digit]),
    "101",
  ].join("");

  return (
    <svg
      viewBox="0 0 113 70"
      width="339"
      height="210"
      role="img"
      aria-label={`UPC-A barcode ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width="113" height="70" fill="#fff" />
      {modules.split("").map((bit, index) =>
        bit === "1" ? (
          <rect
            key={index}
            x={index + 9}
            y="3"
            width="1"
            height={
              index < 3 || (index >= 45 && index < 50) || index >= 92
                ? 55
                : 49
            }
            fill="#000"
          />
        ) : null,
      )}
      <text
        x="56.5"
        y="66"
        fill="#000"
        fontFamily="monospace"
        fontSize="7"
        textAnchor="middle"
      >
        {value}
      </text>
    </svg>
  );
}
