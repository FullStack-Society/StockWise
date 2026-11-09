import "server-only";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type SaleInput = {
  sale_id: string;
  payment_method: "cash" | "card" | "qr";
  items: Array<{ product_id: number; quantity: number }>;
};

export async function checkoutSale(input: SaleInput) {
  return apiRequest<{ sale_id: string; items_sold: number }>(
    ENDPOINTS.sales.checkout,
    { method: "POST", body: input },
  );
}
