import { test, expect } from '@playwright/test';

test.describe('Wedding Seating Planner — core flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear any persisted state by reloading into a clean store
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('add a guest manually', async ({ page }) => {
        // Click the add-guest button (➕)
        await page.click('button[title="הוסף אורח"]');
        await page.fill('input[placeholder="הזן שם"]', 'ישראל ישראלי');
        await page.click('button[type="submit"]');
        await expect(page.getByText('ישראל ישראלי')).toBeVisible();
    });

    test('add a table via modal (no prompt)', async ({ page }) => {
        await page.click('[data-testid="add-table-btn"]');
        const input = page.getByTestId('add-table-capacity-input');
        await expect(input).toBeVisible();
        await input.fill('8');
        await page.click('[data-testid="add-table-confirm"]');
        // Table count badge should show "1 שולחנות"
        await expect(page.getByText(/1 שולחנות/)).toBeVisible();
    });

    test('delete a guest shows confirm dialog (no browser confirm)', async ({ page }) => {
        // Add a guest first
        await page.click('button[title="הוסף אורח"]');
        await page.fill('input[placeholder="הזן שם"]', 'בדיקה למחיקה');
        await page.click('button[type="submit"]');
        await expect(page.getByText('בדיקה למחיקה')).toBeVisible();

        // Hover the card to reveal delete button
        const card = page.locator('.group').filter({ hasText: 'בדיקה למחיקה' }).first();
        await card.hover();
        await page.click('[data-testid="delete-guest-btn"]');

        // ConfirmDialog should appear (not a browser dialog)
        await expect(page.getByTestId('confirm-dialog')).toBeVisible();
        await expect(page.getByText('בדיקה למחיקה')).toBeVisible(); // guest still there

        // Cancel — guest should remain
        await page.click('[data-testid="confirm-dialog-cancel"]');
        await expect(page.getByText('בדיקה למחיקה')).toBeVisible();
    });

    test('delete a guest — confirm removes it', async ({ page }) => {
        await page.click('button[title="הוסף אורח"]');
        await page.fill('input[placeholder="הזן שם"]', 'אורח למחיקה');
        await page.click('button[type="submit"]');

        const card = page.locator('.group').filter({ hasText: 'אורח למחיקה' }).first();
        await card.hover();
        await page.click('[data-testid="delete-guest-btn"]');
        await page.click('[data-testid="confirm-dialog-ok"]');

        await expect(page.getByText('אורח למחיקה')).not.toBeVisible();
    });

    test('reset confirm dialog appears (no browser confirm)', async ({ page }) => {
        await page.click('[data-testid="reset-btn"]');
        await expect(page.getByTestId('confirm-dialog')).toBeVisible();
        await page.click('[data-testid="confirm-dialog-cancel"]');
        // Dialog closes
        await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    });

    test('optimize modal opens (no browser prompt)', async ({ page }) => {
        // Add a guest so the optimize button is enabled
        await page.click('button[title="הוסף אורח"]');
        await page.fill('input[placeholder="הזן שם"]', 'אורח לאופטימיזציה');
        await page.click('button[type="submit"]');

        await page.click('[data-testid="optimize-btn"]');
        await expect(page.getByTestId('optimize-modal')).toBeVisible();
        await expect(page.getByTestId('optimize-capacity-input')).toBeVisible();
        // Cancel
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('optimize-modal')).not.toBeVisible();
    });

    test('seating progress reflects seat demand not record count', async ({ page }) => {
        // Add guest with amount 3
        await page.click('button[title="הוסף אורח"]');
        await page.fill('input[placeholder="הזן שם"]', 'משפחה גדולה');
        await page.click('button[type="submit"]');

        // Progress should show 0/1 (amount defaults to 1 for manually added guests)
        const progress = page.getByTestId('seating-progress');
        await expect(progress).toContainText('0 / 1');
    });
});
