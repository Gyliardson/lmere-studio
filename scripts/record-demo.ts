import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

async function ensureDirs() {
  const dirs = [
    '.tmp',
    '.tmp/raw_videos',
    '.tmp/audio',
    '.tmp/screenshots',
    '.tmp/output'
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

// Inject custom visible mouse pointer in page
async function injectCustomCursor(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('playwright-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'playwright-cursor';
      cursor.style.position = 'fixed';
      cursor.style.top = '0px';
      cursor.style.left = '0px';
      cursor.style.width = '22px';
      cursor.style.height = '22px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(236, 72, 153, 0.85)';
      cursor.style.border = '2px solid rgba(255, 255, 255, 0.95)';
      cursor.style.boxShadow = '0 0 14px rgba(236, 72, 153, 0.7), 0 0 4px rgba(0, 0, 0, 0.5)';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '9999999';
      cursor.style.transition = 'transform 0.15s ease, background-color 0.15s ease';
      cursor.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(cursor);
    });
  });
}

// Smooth mouse movement using linear/Bézier interpolation
async function smoothMove(page: Page, fromX: number, fromY: number, toX: number, toY: number, steps = 22) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const currentX = fromX + (toX - fromX) * ease;
    const currentY = fromY + (toY - fromY) * ease;
    
    await page.mouse.move(currentX, currentY);
    await page.evaluate(({ x, y }) => {
      const cursor = document.getElementById('playwright-cursor');
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      }
    }, { x: currentX, y: currentY });
    
    await page.waitForTimeout(15);
  }
}

// Smooth click on selector or element center
async function smoothClick(page: Page, selector: string, currentPos = { x: 500, y: 300 }): Promise<{ x: number; y: number }> {
  const loc = page.locator(selector).first();
  if (await loc.isVisible()) {
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      
      await smoothMove(page, currentPos.x, currentPos.y, targetX, targetY, 20);
      
      await page.evaluate(() => {
        const cursor = document.getElementById('playwright-cursor');
        if (cursor) {
          cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
          cursor.style.backgroundColor = 'rgba(139, 92, 246, 0.9)';
        }
      });
      await page.waitForTimeout(100);
      
      await loc.click();
      
      await page.evaluate(() => {
        const cursor = document.getElementById('playwright-cursor');
        if (cursor) {
          cursor.style.transform = 'translate(-50%, -50%) scale(1)';
          cursor.style.backgroundColor = 'rgba(236, 72, 153, 0.85)';
        }
      });
      
      await page.waitForTimeout(300);
      return { x: targetX, y: targetY };
    }
  }
  return currentPos;
}

async function runMobileScenario() {
  console.log('[RECORD] Starting Mobile Customer Flow (375x812)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    recordVideo: {
      dir: path.resolve('.tmp/raw_videos'),
      size: { width: 375, height: 812 }
    }
  });
  
  const page = await context.newPage();
  await injectCustomCursor(page);
  
  let pos = { x: 187, y: 100 };
  
  // 1. Storefront Home
  await page.goto(`${BASE_URL}/atelie-doce-arte`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.tmp/screenshots/01-mobile-storefront.png', fullPage: false });
  
  // 2. Select Date
  const dateButtons = page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
  const count = await dateButtons.count();
  if (count > 0) {
    const validDate = dateButtons.nth(Math.min(5, count - 1));
    const text = await validDate.innerText();
    pos = await smoothClick(page, `button:has-text("${text}")`, pos);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/screenshots/02-mobile-date-selected.png' });
  
  // Click Next -> Step 2 (Size)
  pos = await smoothClick(page, 'button:has-text("Próximo")', pos);
  await page.waitForTimeout(1000);
  
  // 3. Select Cake Size (Medio / 20 pessoas)
  const sizeOption = page.locator('button, div').filter({ hasText: /Medio|Médio|20|2.5/i }).first();
  if (await sizeOption.isVisible()) {
    const box = await sizeOption.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 20);
      await sizeOption.click();
      pos = { x: targetX, y: targetY };
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/screenshots/03-mobile-size-selected.png' });
  
  // Click Next -> Step 3 (Flavors)
  pos = await smoothClick(page, 'button:has-text("Próximo")', pos);
  await page.waitForTimeout(1000);
  
  // 4. Select Dough & Filling
  const doughOption = page.locator('button, div').filter({ hasText: /Baunilha|Cacau|Massa/i }).first();
  if (await doughOption.isVisible()) {
    const box = await doughOption.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 15);
      await doughOption.click();
      pos = { x: targetX, y: targetY };
    }
  }
  await page.waitForTimeout(500);
  
  const fillingOption = page.locator('button, div').filter({ hasText: /Ninho|Brigadeiro|Morango/i }).first();
  if (await fillingOption.isVisible()) {
    const box = await fillingOption.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 15);
      await fillingOption.click();
      pos = { x: targetX, y: targetY };
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/screenshots/04-mobile-flavors-selected.png' });
  
  // Click Next -> Step 4 (Details)
  pos = await smoothClick(page, 'button:has-text("Próximo")', pos);
  await page.waitForTimeout(1000);
  
  // 5. Fill Details
  const msgInput = page.locator('input[placeholder*="Topo"], input[placeholder*="bolo"], textarea').first();
  if (await msgInput.isVisible()) {
    const box = await msgInput.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 15);
      await msgInput.fill('Parabéns Mariana! 30 Anos');
      pos = { x: targetX, y: targetY };
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/screenshots/05-mobile-details.png' });
  
  // Click Next -> Step 5 (Summary & Deposit)
  pos = await smoothClick(page, 'button:has-text("Próximo")', pos);
  await page.waitForTimeout(1000);
  
  // 6. Fill Customer Info
  const nameInput = page.locator('input[placeholder*="Nome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Mariana Oliveira');
  }
  const phoneInput = page.locator('input[placeholder*="WhatsApp"], input[placeholder*="Telefone"]').first();
  if (await phoneInput.isVisible()) {
    await phoneInput.fill('11998877665');
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '.tmp/screenshots/06-mobile-summary-pix.png' });
  
  // Hover / Focus WhatsApp button
  const waBtn = page.locator('button:has-text("WhatsApp")').first();
  if (await waBtn.isVisible()) {
    const box = await waBtn.boundingBox();
    if (box) {
      await smoothMove(page, pos.x, pos.y, box.x + box.width / 2, box.y + box.height / 2, 25);
    }
  }
  await page.waitForTimeout(2000);
  
  const videoPath = await page.video()?.path();
  await page.close();
  await context.close();
  await browser.close();
  
  if (videoPath && fs.existsSync(videoPath)) {
    const targetPath = path.resolve('.tmp/raw_videos/mobile_recording.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('[OK] Saved mobile video recording to:', targetPath);
  }
}

async function runDesktopScenario() {
  console.log('[RECORD] Starting Desktop Admin Flow (1920x1080)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: path.resolve('.tmp/raw_videos'),
      size: { width: 1920, height: 1080 }
    }
  });
  
  const page = await context.newPage();
  await injectCustomCursor(page);
  
  let pos = { x: 960, y: 540 };
  
  // 1. Admin Login Page
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.tmp/screenshots/07-desktop-admin-login.png' });
  
  // Fill Slug & Password
  const slugInput = page.locator('input[value="doce-arte"], input[type="text"]').first();
  if (await slugInput.isVisible()) {
    const box = await slugInput.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 15);
      pos = { x: targetX, y: targetY };
    }
    await slugInput.fill('doce-arte');
  }
  
  const passInput = page.locator('input[type="password"]').first();
  if (await passInput.isVisible()) {
    const box = await passInput.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, pos.x, pos.y, targetX, targetY, 15);
      pos = { x: targetX, y: targetY };
    }
    await passInput.fill('admin123');
  }
  
  await page.waitForTimeout(500);
  pos = await smoothClick(page, 'button:has-text("Entrar")', pos);
  await page.waitForTimeout(1500);
  
  // 2. Admin Dashboard - Orders Kanban
  await page.screenshot({ path: '.tmp/screenshots/08-desktop-admin-orders-kanban.png' });
  await page.waitForTimeout(2000);
  
  // 3. Brand Personalization Tab
  const brandBtn = page.locator('button:has-text("Personalização"), button:has-text("Marca")').first();
  if (await brandBtn.isVisible()) {
    pos = await smoothClick(page, 'button:has-text("Personalização"), button:has-text("Marca")', pos);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '.tmp/screenshots/09-desktop-admin-branding.png' });
  }
  
  // 4. Agenda & Calendar Blocking Tab
  const calBtn = page.locator('button:has-text("Agenda"), button:has-text("Calendário")').first();
  if (await calBtn.isVisible()) {
    pos = await smoothClick(page, 'button:has-text("Agenda"), button:has-text("Calendário")', pos);
    await page.waitForTimeout(1500);
    
    // Click a calendar day button to show capacity blocking feature
    const dateBtn = page.locator('button').filter({ hasText: /^\d{1,2}$/ }).nth(10);
    if (await dateBtn.isVisible()) {
      const text = await dateBtn.innerText();
      pos = await smoothClick(page, `button:has-text("${text}")`, pos);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '.tmp/screenshots/10-desktop-admin-calendar-blocked.png' });
  }
  
  await page.waitForTimeout(2000);
  const videoPath = await page.video()?.path();
  await page.close();
  await context.close();
  await browser.close();
  
  if (videoPath && fs.existsSync(videoPath)) {
    const targetPath = path.resolve('.tmp/raw_videos/desktop_recording.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('[OK] Saved desktop video recording to:', targetPath);
  }
}

async function main() {
  await ensureDirs();
  await runMobileScenario();
  await runDesktopScenario();
}

main().catch(err => {
  console.error('[ERROR] Recording failed:', err);
  process.exit(1);
});
