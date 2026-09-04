# Portal reorganization validation — 4 September 2026

## Automated checks

- `npm run build`: four HTML entries (shared chooser plus three portals), with
  shared bundled assets. React/JSX imports and Tailwind CSS compilation pass.
- `npm test`: four structure/import checks pass. They cover portal-owned entry
  files/styles/assets, resolvable imports, no private cross-portal imports, stable
  storage keys/role guard wiring, and operator ownership of the stage editor.
- `npm ls --depth=0`: shared root dependency installation is valid.

## Browser smoke checks

Checked the local Vite server at `127.0.0.1:5180`:

- All three portal HTML entries select the expected demo login role.
- 33 non-logout routes rendered: 13 admin, 11 operator, and 9 farmer screens.
- No browser console errors appeared during the route checks.
- Admin and operator logout return to login.
- A farmer opening `/admin/dashboard` is redirected to `/farmer/dashboard`.
- The farmer desktop dashboard was visually inspected.
- At a 390px viewport, farmer dashboard, booking, payment, and history have no
  page-level horizontal overflow. A narrow-grid minimum-width fix keeps the
  dashboard stepper scrolling inside its card instead of widening the page.

These are migration smoke checks, not a fresh full workflow/security audit.
Historical workflow checks are preserved separately in
`VALIDATION-before-reorganization.md`.

## Cleanup note

The old nested dependency files and build output were removed where possible;
they are regenerable through the root npm commands. An old running process still
holds the empty `frontend/web/farmer-portal` directory and two ignored native
binaries under `Farmer-portal/node_modules`. No source code remains in those old
locations. Stop the old development server/terminal before removing the remnants.
The new source and Vite configuration do not depend on them.
