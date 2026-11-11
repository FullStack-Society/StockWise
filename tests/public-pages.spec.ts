import { test, expect } from "@playwright/test";

test("login page shows required sign-in fields", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("password", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /remember me/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toBeVisible();
});

test("login page can navigate to registration", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Create an account" }).click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: /create your stockwise account/i }),
  ).toBeVisible();
});

test("forgot-password page shows its email form", async ({ page }) => {
  await page.goto("/forgot-password");

  await expect(
    page.getByRole("heading", { name: "Forgot password?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send reset link" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to sign in" }),
  ).toBeVisible();
});

test("reset-password page explains when the reset token is missing", async ({
  page,
}) => {
  await page.goto("/reset-password");

  await expect(
    page.getByRole("heading", { name: "Create a new password" }),
  ).toBeVisible();
  await expect(
    page.getByText("This reset link is missing or invalid."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request another link" }),
  ).toBeVisible();
});

for (const route of [
  "/pages/dashboard",
  "/pages/inventory",
  "/pages/orders",
  "/pages/sales",
  "/pages/reports",
  "/pages/users",
  "/pages/settings",
]) {
  test(`${route} redirects signed-out visitors to login`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
}
