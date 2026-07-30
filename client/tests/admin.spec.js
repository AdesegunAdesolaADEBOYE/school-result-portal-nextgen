import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@school.edu.ng';
const ADMIN_PASSWORD = 'Admin@12345';

test.describe('Admin dashboard actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/admin');
  });

  test('should create a student and verify it appears in the list', async ({ page }) => {
    await page.click('text=Students');
    await expect(page.locator('h1')).toHaveText('Students');

    const randomSuffix = Date.now();
    const admissionNo = `STU/2025/${randomSuffix.toString().slice(-3)}`;
    const fullName = `Playwright Test ${randomSuffix}`;

    const fullNameInput = page.locator('div.field', { hasText: 'Full name' }).locator('input');
    const admissionNoInput = page.locator('div.field', { hasText: 'Admission no.' }).locator('input');
    const classSelect = page.locator('div.field', { hasText: 'Class' }).locator('select');
    const pinInput = page.locator('div.field', { hasText: 'PIN (4-6 digits)' }).locator('input');

    await expect(fullNameInput).toBeVisible();
    await expect(admissionNoInput).toBeVisible();
    await expect(classSelect).toBeVisible();
    await expect(pinInput).toBeVisible();

    await fullNameInput.fill(fullName);
    await admissionNoInput.fill(admissionNo);
    await classSelect.selectOption({ index: 1 });
    await pinInput.fill('1234');

    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Student added.')).toBeVisible();

    await expect(page.locator(`text=${fullName}`)).toBeVisible();
    await expect(page.locator(`text=${admissionNo}`)).toBeVisible();
  });
});
