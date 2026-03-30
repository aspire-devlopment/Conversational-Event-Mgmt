import { chromium } from 'playwright';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const screenshotDir = path.join(repoRoot, 'screenshots');
const execFileAsync = promisify(execFile);

const appURL = process.env.APP_URL || 'http://localhost:3000';
const apiURL = process.env.API_URL || 'http://localhost:5000/api';
const adminEmail = process.env.TEST_ADMIN_EMAIL || 'testadmin@example.com';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

async function ensureDir() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function apiLogin(email, password) {
  const response = await fetch(`${apiURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  const data = await response.json();
  return data?.data || data;
}

async function refreshTestAdminSeed() {
  await execFileAsync('node', ['scripts/createTestAdmin.js'], {
    cwd: path.join(repoRoot, 'backend'),
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    maxBuffer: 1024 * 1024,
  });
}

async function apiRegister({ firstName, lastName, email, phone, password, role }) {
  const response = await fetch(`${apiURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, phone, password, role }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Register failed for ${email}: ${response.status}`);
  }

  return response.ok ? response.json() : null;
}

async function apiCreateEvent(token, payload) {
  const response = await fetch(`${apiURL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': `shot-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Event create failed: ${response.status}`);
  }

  return response.json();
}

async function capture(page, file, route) {
  await page.goto(`${appURL}${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(screenshotDir, file),
    fullPage: true,
  });
}

async function loginThroughUi(page, email, password) {
  await page.goto(`${appURL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin/events', { timeout: 15000 });
}

async function sendChatMessage(page, message) {
  const textarea = page.locator('#chat-message');
  await textarea.fill(message);
  await page.getByRole('button', { name: /^send$/i }).click();
  await page.waitForTimeout(2500);
}

async function resetChatSessions(page) {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('admin-chat-session:'))
      .forEach((key) => localStorage.removeItem(key));
  });
}

async function registerThroughUi(page, user) {
  await page.goto(`${appURL}/signup`, { waitUntil: 'networkidle' });
  await page.locator('input[name="firstName"]').fill(user.firstName);
  await page.locator('input[name="lastName"]').fill(user.lastName);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="phone"]').fill(user.phone);
  await page.locator('select[name="role"]').selectOption(user.role);
  await page.locator('input[name="password"]').fill(user.password);
  await page.screenshot({
    path: path.join(screenshotDir, 'register-screen.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(screenshotDir, 'registration-success.png'),
    fullPage: true,
  });
}

async function demoEventCreation(page, eventName) {
  await resetChatSessions(page);
  await page.goto(`${appURL}/admin/chat`, { waitUntil: 'networkidle' });

  await sendChatMessage(
    page,
    `I want to create an event called ${eventName}. The subheading is Growing Better Teams, the description is a workshop for managers and team leads, the banner URL is https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80, the timezone is Asia/Katmandu, set the status to Published, start it on April 3, 2026 at 10 AM, end it at 12 PM, vanish it one day later, and assign the roles Admin and Manager.`
  );

  await page
    .getByText(/Event Draft|Do you want to save this event\?|What would you like to do next\?/i)
    .waitFor({
      state: 'visible',
      timeout: 20000,
    });
  await page.screenshot({
    path: path.join(screenshotDir, 'event-confirmation.png'),
    fullPage: true,
  });

  await sendChatMessage(page, 'save now');
  // Wait for the shared success banner instead of one exact sentence.
  await page.locator('div.border-green-200.bg-green-50').waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await page.screenshot({
    path: path.join(screenshotDir, 'conversation-flow.png'),
    fullPage: true,
  });
}

async function demoEventUpdate(page, eventId) {
  await resetChatSessions(page);
  await page.goto(`${appURL}/admin/chat?eventId=${eventId}`, { waitUntil: 'networkidle' });

  await sendChatMessage(
    page,
    'Please change the start time to April 3, 2026 at 2 PM and keep the rest the same.'
  );
  await page.getByText(/Do you want to save this event\?|Event Draft/i).waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await sendChatMessage(page, 'save now');
  await page.locator('div.border-green-200.bg-green-50').waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await page.screenshot({
    path: path.join(screenshotDir, 'event-update.png'),
    fullPage: true,
  });
}

async function demoMultilingualFlow(page, language, message, fileName) {
  await resetChatSessions(page);
  await page.goto(`${appURL}/admin/chat`, { waitUntil: 'networkidle' });

  await page.locator('select').first().selectOption(language);
  await page.waitForTimeout(1500);
  await sendChatMessage(page, message);
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(screenshotDir, fileName),
    fullPage: true,
  });
}

async function demoClearSession(page) {
  await resetChatSessions(page);
  await page.goto(`${appURL}/admin/chat`, { waitUntil: 'networkidle' });
  await sendChatMessage(page, 'I want to create an event called Clear Session Demo.');
  await resetChatSessions(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(/Welcome|AI Event Creation Assistant|Initializing chat/i).waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await page.screenshot({
    path: path.join(screenshotDir, 'clear-chat-session.png'),
    fullPage: true,
  });
}

async function demoAdminUsersFlow(page, userEmail, newPassword) {
  await page.goto(`${appURL}/admin/users`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(screenshotDir, 'admin-users-dashboard.png'),
    fullPage: true,
  });

  const row = page
    .locator('tbody tr')
    .filter({ hasText: userEmail })
    .first();

  await row.getByRole('button', { name: /reset password/i }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

  const modal = page.locator('div.fixed.inset-0.z-50');
  await modal.locator('input[name="newPassword"]').fill(newPassword);
  await modal.locator('input[name="confirmPassword"]').fill(newPassword);
  await page.screenshot({
    path: path.join(screenshotDir, 'password-reset-flow.png'),
    fullPage: true,
  });

  await modal.getByRole('button', { name: /save password/i }).click();
  await page.locator('div.border-emerald-200.bg-emerald-50').waitFor({
    state: 'visible',
    timeout: 15000,
  });
  await page.screenshot({
    path: path.join(screenshotDir, 'password-reset-success.png'),
    fullPage: true,
  });
}

async function main() {
  await ensureDir();

  const runTag = Date.now().toString();
  const managerEmail = `manager.${runTag}@example.com`;
  const managerPassword = 'Manager123!';
  const apiEventName = `Manager Visibility Demo ${runTag}`;
  const chatEventName = `Leadership Workshop ${runTag}`;

  await apiRegister({
    firstName: 'Role',
    lastName: 'Manager',
    email: managerEmail,
    phone: '555-111-2222',
    password: managerPassword,
    role: 'Manager',
  });

  let adminAuth;
  try {
    adminAuth = await apiLogin(adminEmail, adminPassword);
  } catch {
    await refreshTestAdminSeed();
    adminAuth = await apiLogin(adminEmail, adminPassword);
  }
  const adminToken = adminAuth.token;

  const createdEventResponse = await apiCreateEvent(adminToken, {
    name: apiEventName,
    subheading: 'Role-based event example',
    description: 'A sample event created for screenshot capture.',
    banner_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80',
    timezone: 'Asia/Katmandu',
    status: 'Published',
    start_time: '2026-04-01T10:00:00.000Z',
    end_time: '2026-04-01T11:00:00.000Z',
    vanish_time: '2026-04-02T11:00:00.000Z',
    language: 'en',
    roles: ['Manager', 'Sales Rep'],
  });

  const createdEvent =
    createdEventResponse?.data?.event ||
    createdEventResponse?.event ||
    createdEventResponse;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1600 },
    colorScheme: 'light',
  });
  const page = await context.newPage();

  await capture(page, 'login-screen.png', '/login');
  await registerThroughUi(page, {
    firstName: 'Fresh',
    lastName: 'Manager',
    email: `fresh.manager.${runTag}@example.com`,
    phone: '555-111-2222',
    password: 'Manager123!',
    role: 'Manager',
  });

  await loginThroughUi(page, adminEmail, adminPassword);
  await capture(page, 'admin-dashboard.png', '/admin/events');
  await capture(page, 'chat-interface.png', '/admin/chat');

  await demoEventCreation(page, chatEventName);
  await capture(page, 'event-listing.png', '/admin/events');

  await demoEventUpdate(page, createdEvent?.id);

  await demoMultilingualFlow(
    page,
    'fr',
    `Bonjour, je veux créer un événement nommé Atelier Leadership ${runTag}. Le sous-titre est Développement d'équipe, la description est une session pour les responsables, le fuseau horaire est Asia/Katmandu, le statut est Brouillon, commence le 5 avril 2026 à 10h, termine à 12h, et les rôles sont Admin et Manager.`,
    'multilingual-french.png'
  );

  await demoMultilingualFlow(
    page,
    'es',
    `Hola, quiero crear un evento llamado Taller de Ventas ${runTag}. El subtítulo es Equipo comercial, la descripción es una sesión para el equipo de ventas, la zona horaria es Asia/Katmandu, el estado es Borrador, comienza el 6 de abril de 2026 a las 10 AM, termina a las 12 PM, y los roles son Admin y Sales Rep.`,
    'multilingual-spanish.png'
  );

  await demoClearSession(page);
  await loginThroughUi(page, managerEmail, managerPassword);
  await capture(page, 'role-based-view.png', '/admin/events');
  await loginThroughUi(page, adminEmail, adminPassword);
  await demoAdminUsersFlow(page, managerEmail, 'Manager456!');

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
