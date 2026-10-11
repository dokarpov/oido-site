import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:4173/';

async function gotoForm(page) {
  await page.goto(URL);
  await page.locator('#lead-form').scrollIntoViewIfNeeded();
  await expect(page.locator('#lead-form')).toBeVisible();
}

async function mockSubmit(page, handler) {
  await page.route('https://formsubmit.co/ajax/diego@sinthetic.io', handler);
}

test('form is intentionally minimal', async ({ page }) => {
  await gotoForm(page);
  const form = page.locator('#lead-form');
  await expect(form.locator('#lead-biz')).toHaveCount(1);
  await expect(form.locator('#lead-email')).toHaveCount(1);
  await expect(form.locator('#lead-lisbon')).toHaveCount(0);
  await expect(form.locator('#lead-kind')).toHaveCount(0);
  await expect(form.locator('[data-lead-plan]')).toHaveCount(0);
  await expect(form.getByRole('button', { name: /Request pilot access/i })).toHaveCount(1);
});

test('successful submit stays on site and shows success', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => {
    calls++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'ok' })
    });
  });
  await gotoForm(page);
  const before = page.url();
  await page.locator('#lead-biz').fill('La Curandera');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.getByRole('button', { name: /Request pilot access/i }).click();

  await expect(page.locator('#lead-status')).toContainText('Request sent');
  await expect(page.locator('#lead-status')).toBeVisible();
  await expect(page.locator('#lead-form')).toHaveClass(/is-sent/);
  expect(page.url()).toBe(before);
  expect(calls).toBe(1);
});

test('submit payload contains only useful lead data and silent plan context', async ({ page }) => {
  let body;
  await mockSubmit(page, async route => {
    body = JSON.parse(route.request().postData());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await gotoForm(page);
  await page.evaluate(() => { window.__oidoPlan = 'venue'; });
  await page.locator('#lead-biz').fill('Café Ñ');
  await page.locator('#lead-email').fill('hello@example.com');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());

  await expect(page.locator('#lead-status')).toBeVisible();
  expect(body.business).toBe('Café Ñ');
  expect(body.email).toBe('hello@example.com');
  expect(body.plan_clicked).toBe('venue');
  expect(body).not.toHaveProperty('lisbon');
  expect(body).not.toHaveProperty('kind');
});

test('blank and whitespace-only business is rejected locally', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => { calls++; await route.abort(); });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('   ');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());

  await expect(page.locator('#lead-error')).toContainText('business name');
  await expect(page.locator('#lead-biz')).toBeFocused();
  expect(calls).toBe(0);
});

for (const badEmail of ['bad', 'a@b', '@example.com', 'a b@example.com', 'a@example']) {
  test('invalid email is rejected locally: ' + badEmail, async ({ page }) => {
    let calls = 0;
    await mockSubmit(page, async route => { calls++; await route.abort(); });
    await gotoForm(page);
    await page.locator('#lead-biz').fill('Business');
    await page.locator('#lead-email').fill(badEmail);
    await page.locator('#lead-form').evaluate(form => form.requestSubmit());

    await expect(page.locator('#lead-error')).toContainText('valid email');
    expect(calls).toBe(0);
  });
}

test('unicode business names and surrounding whitespace are normalized safely', async ({ page }) => {
  let body;
  await mockSubmit(page, async route => {
    body = JSON.parse(route.request().postData());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('  La   Curandera — Ñandú  ');
  await page.locator('#lead-email').fill('  owner@example.com  ');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await expect(page.locator('#lead-status')).toBeVisible();

  expect(body.business).toBe('La Curandera — Ñandú');
  expect(body.email).toBe('owner@example.com');
});

test('maxlength limits oversized business and email values', async ({ page }) => {
  await gotoForm(page);
  await page.locator('#lead-biz').fill('x'.repeat(180));
  await expect(page.locator('#lead-biz')).toHaveValue('x'.repeat(120));
  await page.locator('#lead-email').fill('a'.repeat(300));
  const value = await page.locator('#lead-email').inputValue();
  expect(value.length).toBeLessThanOrEqual(254);
});

test('honeypot blocks bot submission without network call', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => { calls++; await route.abort(); });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-honey').evaluate(el => { el.value = 'spam'; });
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await page.waitForTimeout(150);

  expect(calls).toBe(0);
  await expect(page.locator('#lead-status')).toBeHidden();
  await expect(page.locator('#lead-error')).toBeHidden();
});

test('double tap cannot create duplicate submissions', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  const submit = page.getByRole('button', { name: /Request pilot access/i });
  await submit.click();
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());

  await expect(page.locator('#lead-status')).toBeVisible();
  expect(calls).toBe(1);
});

test('server failure stays in-page, restores button, and allows retry', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => {
    calls++;
    if (calls === 1) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'down' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());

  await expect(page.locator('#lead-error')).toContainText('couldn’t send');
  await expect(page.getByRole('button', { name: /Request pilot access/i })).toBeEnabled();

  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await expect(page.locator('#lead-status')).toContainText('Request sent');
  expect(calls).toBe(2);
});

test('network failure never navigates to email client or away from page', async ({ page }) => {
  await mockSubmit(page, async route => { await route.abort('failed'); });
  await gotoForm(page);
  const before = page.url();
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());

  await expect(page.locator('#lead-error')).toBeVisible();
  expect(page.url()).toBe(before);
});

test('Enter from email submits the form', async ({ page }) => {
  let calls = 0;
  await mockSubmit(page, async route => {
    calls++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-email').press('Enter');

  await expect(page.locator('#lead-status')).toBeVisible();
  expect(calls).toBe(1);
});

test('mobile layout has no horizontal overflow and CTA remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoForm(page);
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(overflow.width).toBeLessThanOrEqual(overflow.client + 1);

  const button = page.getByRole('button', { name: /Request pilot access/i });
  const box = await button.boundingBox();
  expect(box.width).toBeGreaterThan(250);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
});

test('Get started scrolls to the same simple form and does not open an external app', async ({ page }) => {
  await page.goto(URL);
  const before = page.url();
  await page.locator('header [data-tofind]').click();
  await expect(page.locator('#lead-form')).toBeInViewport();
  await expect(page.locator('#lead-biz')).toBeFocused({ timeout: 1500 });
  expect(page.url()).toBe(before);
});

test('core form flow produces no uncaught page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await mockSubmit(page, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await gotoForm(page);
  await page.locator('#lead-biz').fill('Business');
  await page.locator('#lead-email').fill('owner@example.com');
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await expect(page.locator('#lead-status')).toBeVisible();
  expect(errors).toEqual([]);
});
