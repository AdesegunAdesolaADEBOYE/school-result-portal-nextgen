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

  test('should show admin overview metrics', async ({ page }) => {
    await page.click('text=Overview');
    await expect(page.locator('h1')).toHaveText('Overview');

    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Students' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Teachers' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Classes & Subjects' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Assignments' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Terms' })).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> a', { hasText: 'Results' })).toBeVisible();
  });

  test('should create a teacher and verify it appears in the list', async ({ page }) => {
    await page.click('text=Teachers');
    await expect(page.locator('h1')).toHaveText('Teachers');

    const randomSuffix = Date.now();
    const name = `Playwright Teacher ${randomSuffix}`;
    const email = `teacher.${randomSuffix}@school.edu.ng`;
    const password = `TeachPass${randomSuffix.toString().slice(-4)}`;

    await page.fill('div.field:has-text("Full name") input', name);
    await page.fill('div.field:has-text("Email") input', email);
    await page.fill('div.field:has-text("Temporary password") input', password);

    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Teacher account created.')).toBeVisible();
    await expect(page.locator(`text=${name}`)).toBeVisible();
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test('should create a student and verify it appears in the list', async ({ page }) => {
    await page.click('text=Students');
    await expect(page.locator('h1')).toHaveText('Students');

    const randomSuffix = Date.now();
    const admissionNo = `STU/2025/${randomSuffix.toString().slice(-3)}`;
    const fullName = `Playwright Test ${randomSuffix}`;

    const fullNameInput = page.locator('form.inline-form div.field', { hasText: 'Full name' }).locator('input');
    const admissionNoInput = page.locator('form.inline-form div.field', { hasText: 'Admission no.' }).locator('input');
    const classSelect = page.locator('form.inline-form div.field', { hasText: 'Class' }).locator('select');
    const pinInput = page.locator('form.inline-form div.field', { hasText: 'PIN (4-6 digits)' }).locator('input');

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

  test('should promote selected students to the next class', async ({ page }) => {
    await page.click('text=Students');
    await expect(page.locator('h1')).toHaveText('Students');

    const row = page.locator('table tbody tr').first();
    await expect(row).toBeVisible();

    await row.locator('input[type="checkbox"]').check();
    await page.selectOption('div.field:has-text("Promote to class") select', { index: 1 });
    await page.click('button:has-text("Promote selected")');

    await expect(page.locator('text=student(s) promoted successfully.')).toBeVisible();
  });

  test('should export a student result slip as PDF', async ({ page }) => {
    await page.click('text=Students');
    await expect(page.locator('h1')).toHaveText('Students');

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    const admissionNo = await firstRow.locator('td').nth(2).innerText();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/students/') && res.url().includes('/slip') && res.request().method() === 'GET'),
      firstRow.locator('button:has-text("Export slip")').click(),
    ]);

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('admission_no', admissionNo);
    expect(data).toHaveProperty('rank');
    expect(data).toHaveProperty('class_size');
    expect(data.class_size).toBeGreaterThan(0);
  });
});
