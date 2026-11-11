import { test, expect } from "@playwright/test";

test("registration page shows password fields", async ({ page }) => {
  await page.goto("/register");

  await expect(
    page.getByRole("heading", { name: /create your stockwise account/i }),
  ).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Last name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  const password = page.getByLabel("Password", { exact: true });
  const confirmation = page.getByLabel("Confirm password");
  await expect(password).toHaveAttribute("minlength", "8");
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");

  await page.getByLabel("Show both passwords").check();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "text");

  await page.getByLabel("Show both passwords").uncheck();
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");
});
