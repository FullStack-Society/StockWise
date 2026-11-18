"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { checkoutSale, getMerchantQr, saveMerchantQr } from "@/lib/api/sales";
import { requireOrganizationSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

type SaleInput = {
  saleId: string;
  paymentMethod: "cash" | "card" | "qr";
  items: Array<{ productId: number; quantity: number }>;
};

const SALE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getMerchantQrAction() {
  await requireOrganizationSession();
  try {
    const result = await getMerchantQr();
    return { ok: true as const, imageData: result.image_data };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not load the organization's payment QR.",
    };
  }
}

export async function saveMerchantQrAction(imageData: string) {
  await requireOrganizationSession();
  if (
    typeof imageData !== "string" ||
    imageData.length > 2_100_000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageData)
  ) {
    return { ok: false as const, error: "Choose a PNG, JPEG, or WebP image under 1.5 MB." };
  }
  try {
    await saveMerchantQr(imageData);
    revalidatePath(ROUTES.sales);
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not save the organization's payment QR.",
    };
  }
}

export async function checkoutSaleAction(input: SaleInput) {
  await requireOrganizationSession();
  if (
    !input ||
    typeof input.saleId !== "string" ||
    !SALE_ID_PATTERN.test(input.saleId) ||
    !["cash", "card", "qr"].includes(input.paymentMethod) ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 100 ||
    input.items.some(
      (item) =>
        !item ||
        !Number.isSafeInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0,
    )
  ) {
    return { ok: false as const, error: "Add a valid item to the sale." };
  }

  try {
    const result = await checkoutSale({
      sale_id: input.saleId,
      payment_method: input.paymentMethod,
      items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    });
    revalidatePath(ROUTES.sales);
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true as const, saleId: result.sale_id };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not complete this sale. Please try again.",
    };
  }
}
