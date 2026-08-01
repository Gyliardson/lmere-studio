const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const STORE_SLUG = 'doce-arte';

const timingFile = path.resolve('.tmp/audio/timing.json');
let timingData = {
  mobile: [7.37, 6.55, 8.09, 6.55, 6.94, 9.22],
  desktop: [7.46, 8.69, 8.76, 7.13, 6.58, 7.85]
};

if (fs.existsSync(timingFile)) {
  try {
    timingData = JSON.parse(fs.readFileSync(timingFile, 'utf-8'));
    console.log('[OK] Loaded timing.json:', timingData);
  } catch (err) {
    console.warn('[WARN] Could not parse timing.json');
  }
}

async function ensureDirs() {
  const dirs = ['.tmp', '.tmp/raw_videos', '.tmp/audio', '.tmp/screenshots', '.tmp/output'];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

async function injectCustomCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('playwright-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'playwright-cursor';
      cursor.style.position = 'fixed';
      cursor.style.top = '0px';
      cursor.style.left = '0px';
      cursor.style.width = '24px';
      cursor.style.height = '24px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(236, 72, 153, 0.9)';
      cursor.style.border = '2px solid rgba(255, 255, 255, 0.95)';
      cursor.style.boxShadow = '0 0 16px rgba(236, 72, 153, 0.8), 0 0 4px rgba(0, 0, 0, 0.6)';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '9999999';
      cursor.style.transition = 'transform 0.15s ease, background-color 0.15s ease';
      cursor.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(cursor);
    });
  });
}

async function smoothMove(page, fromX, fromY, toX, toY, steps = 24) {
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

async function clickElementCenter(page, locator, currentPos) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 4000 });
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const box = await locator.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, currentPos.x, currentPos.y, targetX, targetY, 20);
      
      await page.evaluate(() => {
        const c = document.getElementById('playwright-cursor');
        if (c) {
          c.style.transform = 'translate(-50%, -50%) scale(0.7)';
          c.style.backgroundColor = 'rgba(139, 92, 246, 0.95)';
        }
      });
      await page.waitForTimeout(120);
      await locator.click({ force: true });
      await page.evaluate(() => {
        const c = document.getElementById('playwright-cursor');
        if (c) {
          c.style.transform = 'translate(-50%, -50%) scale(1)';
          c.style.backgroundColor = 'rgba(236, 72, 153, 0.9)';
        }
      });
      await page.waitForTimeout(300);
      return { x: targetX, y: targetY };
    }
  } catch (err) {
    console.warn('[WARN] Could not click element:', err.message);
  }
  return currentPos;
}

async function clickNextStep(page, currentPos) {
  try {
    await page.waitForTimeout(200);
    const btn = page.locator('#btn-next, button:has-text("Continuar")').first();
    return await clickElementCenter(page, btn, currentPos);
  } catch (err) {
    console.warn('[WARN] Continuar button click failed:', err.message);
  }
  return currentPos;
}

// Ensure strict wait times so video perfectly syncs with audio length
async function syncWait(phaseStart, audioDuration) {
  const elapsed = (Date.now() - phaseStart) / 1000;
  const remaining = audioDuration - elapsed;
  if (remaining > 0) {
    await new Promise(r => setTimeout(r, remaining * 1000));
  }
}

async function smoothScroll(page, amount, steps = 15) {
  const stepAmount = amount / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepAmount);
    await page.waitForTimeout(20);
  }
}

async function runMobileScenario() {
  console.log('[RECORD] Starting Mobile Customer Flow (375x812)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    recordVideo: { dir: path.resolve('.tmp/raw_videos'), size: { width: 375, height: 812 } }
  });
  
  const page = await context.newPage();
  await injectCustomCursor(page);
  let pos = { x: 187, y: 150 };
  const mobT = timingData.mobile;
  
  // Phase 1: Intro
  await page.goto(`${BASE_URL}/${STORE_SLUG}`, { waitUntil: 'networkidle' });
  let pStart = Date.now();
  await page.screenshot({ path: '.tmp/screenshots/01-mobile-storefront.png' });
  await smoothMove(page, pos.x, pos.y, 187, 280, 20);
  pos = { x: 187, y: 280 };
  await syncWait(pStart, mobT[0]);
  
  // Phase 2: Calendar
  pStart = Date.now();
  const dateBtns = page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
  for (let i = 0; i < await dateBtns.count(); i++) {
    if (await dateBtns.nth(i).isVisible()) {
      pos = await clickElementCenter(page, dateBtns.nth(i), pos);
      break;
    }
  }
  await page.screenshot({ path: '.tmp/screenshots/02-mobile-date-selected.png' });
  await syncWait(pStart, mobT[1] - 1.5);
  pos = await clickNextStep(page, pos);
  await syncWait(pStart, mobT[1]);
  
  // Phase 3: Size
  pStart = Date.now();
  const sizeCards = page.locator('button.selection-card').filter({ hasText: /Pequeno|Médio/i });
  for (let i = 0; i < await sizeCards.count(); i++) {
    if (await sizeCards.nth(i).isVisible()) {
      pos = await clickElementCenter(page, sizeCards.nth(i), pos);
      break;
    }
  }
  await page.screenshot({ path: '.tmp/screenshots/03-mobile-size-selected.png' });
  await syncWait(pStart, mobT[2] - 1.5);
  pos = await clickNextStep(page, pos);
  await syncWait(pStart, mobT[2]);
  
  // Phase 4: Flavors
  pStart = Date.now();
  const doughCards = page.locator('button.selection-card').filter({ hasText: /Baunilha/i });
  for (let i = 0; i < await doughCards.count(); i++) {
    if (await doughCards.nth(i).isVisible()) {
      pos = await clickElementCenter(page, doughCards.nth(i), pos);
      break;
    }
  }
  await page.waitForTimeout(300);
  await smoothScroll(page, 500, 25);
  await page.waitForTimeout(600);
  const fillingCards = page.locator('button.selection-card').filter({ hasText: /Ninho|Doce de Leite/i });
  for (let i = 0; i < await fillingCards.count(); i++) {
    if (await fillingCards.nth(i).isVisible()) {
      pos = await clickElementCenter(page, fillingCards.nth(i), pos);
      break;
    }
  }
  await page.screenshot({ path: '.tmp/screenshots/04-mobile-flavors-selected.png' });
  await syncWait(pStart, mobT[3] - 1.5);
  pos = await clickNextStep(page, pos);
  await syncWait(pStart, mobT[3]);
  
  // Phase 5: Details
  pStart = Date.now();
  const msgInput = page.locator('#input-cake-message').first();
  if (await msgInput.isVisible()) {
    pos = await clickElementCenter(page, msgInput, pos);
    await msgInput.fill('Parabéns Mariana! 30 Anos');
  }
  await page.screenshot({ path: '.tmp/screenshots/05-mobile-details.png' });
  await syncWait(pStart, mobT[4] - 1.5);
  pos = await clickNextStep(page, pos);
  await syncWait(pStart, mobT[4]);
  
  // Phase 6: Summary
  pStart = Date.now();
  const nameInput = page.locator('input[placeholder*="Nome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Mariana Oliveira');
  }
  const phoneInput = page.locator('input[placeholder*="WhatsApp"], input[placeholder*="Telefone"]').first();
  if (await phoneInput.isVisible()) {
    await phoneInput.fill('11998877665');
  }
  await page.waitForTimeout(300);
  await smoothScroll(page, 400, 20);
  await page.screenshot({ path: '.tmp/screenshots/06-mobile-summary-pix.png' });
  
  await syncWait(pStart, mobT[5] - 2.5);
  
  const waBtn = page.locator('button:has-text("WhatsApp")').first();
  if (await waBtn.isVisible()) pos = await clickElementCenter(page, waBtn, pos);
  await syncWait(pStart, mobT[5]);
  
  const videoPath = await page.video()?.path();
  await page.close();
  await context.close();
  await browser.close();
  if (videoPath && fs.existsSync(videoPath)) {
    const targetPath = path.resolve('.tmp/raw_videos/mobile_recording.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('[OK] Saved mobile video recording');
  }
}

async function runDesktopScenario() {
  console.log('[RECORD] Starting Desktop Admin Flow (1920x1080)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    recordVideo: { dir: path.resolve('.tmp/raw_videos'), size: { width: 1920, height: 1080 } }
  });
  
  const page = await context.newPage();
  await injectCustomCursor(page);
  let pos = { x: 960, y: 540 };
  const deskT = timingData.desktop;
  
  // Phase 1: Login
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  let pStart = Date.now();
  await page.screenshot({ path: '.tmp/screenshots/07-desktop-admin-login.png' });
  const slugInput = page.locator('#admin-slug, input[type="text"]').first();
  if (await slugInput.isVisible()) await slugInput.fill('doce-arte');
  const passInput = page.locator('#admin-password, input[type="password"]').first();
  if (await passInput.isVisible()) await passInput.fill('admin123');
  const loginBtn = page.locator('#admin-login-btn, button:has-text("Entrar")').first();
  pos = await clickElementCenter(page, loginBtn, pos);
  await syncWait(pStart, deskT[0]);
  
  // Phase 2: Kanban
  pStart = Date.now();
  await page.screenshot({ path: '.tmp/screenshots/08-desktop-admin-orders-kanban.png' });
  await smoothMove(page, pos.x, pos.y, 450, 450, 15);
  await smoothMove(page, 450, 450, 850, 450, 15);
  await smoothMove(page, 850, 450, 1250, 450, 15);
  pos = { x: 1250, y: 450 };
  await syncWait(pStart, deskT[1]);
  
  // Phase 3: Menu
  pStart = Date.now();
  const menuTab = page.locator('aside button').filter({ hasText: /^Cardápio/ }).first();
  if (await menuTab.isVisible()) pos = await clickElementCenter(page, menuTab, pos);
  await page.waitForTimeout(600);
  
  // Navigate sub-tabs
  const subTab1 = page.locator('button').filter({ hasText: /Massas & Recheios/i }).first();
  if (await subTab1.isVisible()) pos = await clickElementCenter(page, subTab1, pos);
  await page.waitForTimeout(600);
  
  const subTab2 = page.locator('button').filter({ hasText: /Adicionais/i }).first();
  if (await subTab2.isVisible()) pos = await clickElementCenter(page, subTab2, pos);
  await page.waitForTimeout(600);
  
  await page.screenshot({ path: '.tmp/screenshots/09-desktop-admin-menu.png' });
  
  const editBtn = page.locator('button[title="Editar"]').first();
  if (await editBtn.isVisible()) {
    pos = await clickElementCenter(page, editBtn, pos);
    await page.waitForTimeout(1000);
    const closeBtn = page.locator('button').filter({ hasText: /^Cancelar|Fechar/i }).first();
    if (await closeBtn.isVisible()) pos = await clickElementCenter(page, closeBtn, pos);
  }
  await syncWait(pStart, deskT[2]);
  
  // Phase 4: Calendar
  pStart = Date.now();
  const calTab = page.locator('aside button').filter({ hasText: /^Agenda/ }).first();
  if (await calTab.isVisible()) pos = await clickElementCenter(page, calTab, pos);
  await page.screenshot({ path: '.tmp/screenshots/10-desktop-admin-calendar-blocked.png' });
  await syncWait(pStart, deskT[3]);
  
  // Phase 5: Brand
  pStart = Date.now();
  const brandTab = page.locator('aside button').filter({ hasText: /^Marca/ }).first();
  if (await brandTab.isVisible()) pos = await clickElementCenter(page, brandTab, pos);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.tmp/screenshots/11-desktop-admin-branding.png' });
  
  const presetBtns = page.locator('button').filter({ hasText: /Rosa|Ouro|Violeta/i });
  const pCount = await presetBtns.count();
  if (pCount >= 1) pos = await clickElementCenter(page, presetBtns.nth(0), pos);
  if (pCount >= 2) pos = await clickElementCenter(page, presetBtns.nth(1), pos);
  await smoothScroll(page, 300, 15);
  
  await syncWait(pStart, deskT[4] - 1.0);
  await smoothScroll(page, -500, 25);
  await syncWait(pStart, deskT[4]);
  
  // Phase 6: Features
  pStart = Date.now();
  const featTab = page.locator('aside button').filter({ hasText: /^Funcionalidades/ }).first();
  if (await featTab.isVisible()) pos = await clickElementCenter(page, featTab, pos);
  await page.screenshot({ path: '.tmp/screenshots/12-desktop-admin-features.png' });
  await syncWait(pStart, deskT[5]);
  
  const videoPath = await page.video()?.path();
  await page.close();
  await context.close();
  await browser.close();
  if (videoPath && fs.existsSync(videoPath)) {
    const targetPath = path.resolve('.tmp/raw_videos/desktop_recording.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('[OK] Saved desktop video recording');
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
