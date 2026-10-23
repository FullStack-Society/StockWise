const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
export const formatCurrency = (value: number) => usd.format(value);
