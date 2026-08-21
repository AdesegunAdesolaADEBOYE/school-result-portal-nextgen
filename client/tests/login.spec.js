import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@school.edu.ng';
const ADMIN_PASSWORD = 'Admin@12345';
const TEACHER_EMAIL = 'bisi.adewale@school.edu.ng';
const TEACHER_PASSWORD = 'Teacher@123';
const STUDENT_ADMISSION = 'STU/2025/001';
const STUDENT_PIN = '1234';

test.describe('Login flows', () => {
  test('should login and show admin overview', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Staff login')).toBeVisible();

    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');

    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toHaveText('Overview');
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Students' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Teachers' })).toBeVisible();
  });

  test('should login as teacher and show teacher dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Staff login')).toBeVisible();

    await page.fill('#email', TEACHER_EMAIL);
    await page.fill('#password', TEACHER_PASSWORD);
    await page.click('button:has-text("Sign in")');

    await expect(page).toHaveURL('/teacher');
    await expect(page.locator('h1')).toHaveText('Enter results');
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Enter Results' })).toBeVisible();
  });

  test('should save scores as a teacher', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Staff login')).toBeVisible();

    await page.fill('#email', TEACHER_EMAIL);
    await page.fill('#password', TEACHER_PASSWORD);
    await page.click('button:has-text("Sign in")');

    await expect(page).toHaveURL('/teacher');
    await expect(page.locator('h1')).toHaveText('Enter results');

    const assignmentSelect = page.locator('div.field', { hasText: 'Class & subject' }).locator('select');
    const termSelect = page.locator('div.field', { hasText: 'Term' }).locator('select');

    await assignmentSelect.selectOption({ index: 1 });
    await termSelect.selectOption({ index: 1 });

    const rosterRow = page.locator('table tbody tr').first();
    await expect(rosterRow).toBeVisible();

    const caInput = rosterRow.locator('input[type="number"]').first();
    const examInput = rosterRow.locator('input[type="number"]').nth(1);

    await caInput.fill('30');
    await examInput.fill('50');

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/teacher/results') && res.request().method() === 'POST'),
      page.click('button:has-text("Save results")'),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.saved).toBeGreaterThan(0);

    const successBanner = page.locator('div.banner.success');
    if (await successBanner.isVisible()) {
      await expect(successBanner).toContainText('Results saved.');
    }
  });

  test('should lookup student result from public form', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Check my result")');

    await page.fill('#adm', STUDENT_ADMISSION);
    await page.fill('#pin', STUDENT_PIN);
    await page.click('button:has-text("View result")');

    await expect(page).toHaveURL('/result');
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible();
    await expect(page.locator('text=Results Portal')).toBeVisible();
    await expect(page.locator('text=Position')).toBeVisible();
  });
});
