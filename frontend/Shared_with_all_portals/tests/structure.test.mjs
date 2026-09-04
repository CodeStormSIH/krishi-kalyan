import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const portals = ['Farmer-portal', 'Admin-portal', 'Procurement-center'];
const shared = resolve(root, 'Shared_with_all_portals/src');
const read = file => readFileSync(resolve(root, file), 'utf8');
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sources(join(directory, entry.name)) :
      /\.(jsx?|mjs)$/.test(entry.name) ? [join(directory, entry.name)] : []);
}

test('each portal owns an HTML entry, routes, assets, CSS and Tailwind', () => {
  for (const portal of portals) {
    for (const file of ['index.html', 'src/main.jsx', 'src/routes.jsx', 'src/pages',
      'src/assets', 'src/styles/portal.css', 'src/styles/tailwind.css']) {
      assert.ok(existsSync(resolve(root, portal, file)), portal + '/' + file);
    }
    assert.ok(read(portal + '/index.html').includes('/' + portal + '/src/main.jsx'));
    const css = read(portal + '/src/styles/tailwind.css');
    assert.ok(css.includes('prefix(tw)'));
    assert.ok(css.includes('../../../Shared_with_all_portals/src'));
    assert.ok(!css.includes('tailwindcss/preflight.css'));
  }
});

test('source imports resolve and portal code does not depend on another portal', () => {
  for (const folder of [...portals, 'Shared_with_all_portals']) {
    for (const file of sources(resolve(root, folder, 'src'))) {
      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        const specifier = match[1];
        if (!specifier.startsWith('.') && !specifier.startsWith('@shared/')) continue;
        const target = specifier.startsWith('@shared/')
          ? resolve(shared, specifier.slice('@shared/'.length))
          : resolve(dirname(file), specifier);
        assert.ok(['', '.js', '.jsx', '/index.js', '/index.jsx'].some(ext => existsSync(target + ext)),
          file + ': missing ' + specifier);
        if (portals.includes(folder)) {
          for (const other of portals.filter(p => p !== folder)) {
            assert.ok(!target.startsWith(resolve(root, other) + '/')
              && !target.startsWith(resolve(root, other) + '\\'), 'Cross-portal private import: ' + file);
          }
        }
      }
    }
  }
});

test('shared state keys and legacy route composition are retained', () => {
  const store = read('Shared_with_all_portals/src/services/store.jsx');
  assert.ok(store.includes('krishi-kalyan-v1'));
  assert.ok(store.includes('krishi-session'));
  const app = read('Shared_with_all_portals/src/App.jsx');
  for (const folder of portals) assert.ok(app.includes(folder + '/src/routes'));
  assert.ok(app.includes('session.role !== role'));
});

test('portal entry requires contact details and OTP before creating a session', () => {
  const login = read('Shared_with_all_portals/src/pages/Login.jsx');
  assert.ok(login.includes('Email address'));
  assert.ok(login.includes('Mobile number'));
  assert.ok(login.includes('Enter 6-digit OTP'));
  assert.ok(login.includes("if (otp !== DEMO_OTP)"));
  assert.ok(login.indexOf('login({') > login.indexOf("if (otp !== DEMO_OTP)"));
  assert.ok(login.includes('Frontend demo only'));
  assert.ok(login.includes("location.state?.role || initialRole"));
  assert.ok(read('Shared_with_all_portals/src/mountPortal.jsx').includes('roleFromPath || initialRole'));
  const store = read('Shared_with_all_portals/src/services/store.jsx');
  assert.ok(store.includes("typeof account === 'string' ? { role: account } : account"));
});

test('operator-only stage editor is owned by the procurement portal', () => {
  assert.ok(read('Procurement-center/src/pages/Stages.jsx').includes('export default function StagesPage'));
  assert.ok(!read('Shared_with_all_portals/src/pages/Management.jsx').includes('export function StagesPage'));
  assert.ok(!read('Admin-portal/src/routes.jsx').includes("path: 'stages'"));
});

