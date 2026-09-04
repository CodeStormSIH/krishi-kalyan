import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

let Sidebar, navigation;
const require = createRequire(import.meta.url);

async function loadComponent(file) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/' + file, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    loader: { '.css': 'empty' },
  });
  const module = { exports: {} };
  // Evaluate only the local source bundle; package imports use Node's CJS loader.
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

before(async () => {
  // Evaluate imports as well as compiling them: missing navigation icons fail here.
  ({ navigation } = await loadComponent('Layout.jsx'));
  ({ default: Sidebar } = await loadComponent('Sidebar.jsx'));
});

const renderSidebar = (role, overrides = {}) => Sidebar({
  role,
  profile: { name: 'Demo User', email: 'demo@example.com', phone: '1234567890' },
  center: 'Demo Center',
  unread: 3,
  navigation: navigation[role],
  menu: { visible: true, isMobile: false, mobileOpen: false, closeMobile() {}, sidebarRef: null, ...overrides },
});

test('all roles use the same sidebar markup and valid navigation icons', () => {
  for (const role of ['farmer', 'admin', 'operator']) {
    for (const [path, label, icon] of navigation[role]) {
      assert.ok(path && label && icon, role + ': invalid navigation entry');
    }
    const [, sidebar] = renderSidebar(role).props.children;
    assert.equal(sidebar.props.id, 'portal-sidebar');
    assert.equal(sidebar.props.className, 'portal-sidebar is-visible');
    assert.equal(sidebar.props.role, undefined);
    assert.equal(sidebar.props.inert, undefined);
  }
});

test('mobile drawer exposes modal semantics and a dismissible backdrop', () => {
  const [backdrop, sidebar] = renderSidebar('admin', { isMobile: true, mobileOpen: true }).props.children;
  assert.equal(backdrop.props['aria-label'], 'Dismiss sidebar');
  assert.equal(backdrop.props.tabIndex, -1);
  assert.equal(typeof backdrop.props.onClick, 'function');
  assert.equal(sidebar.props.role, 'dialog');
  assert.equal(sidebar.props['aria-modal'], true);
  assert.equal(sidebar.props.children[0].props['aria-label'], 'Close sidebar');
});

test('hidden sidebars are excluded from interaction and accessibility navigation', () => {
  for (const isMobile of [true, false]) {
    const [backdrop, sidebar] = renderSidebar('operator', { isMobile, visible: false }).props.children;
    assert.equal(backdrop, false);
    assert.equal(sidebar.props.inert, '');
    assert.equal(sidebar.props['aria-hidden'], true);
    assert.equal(sidebar.props.role, undefined);
  }
});
