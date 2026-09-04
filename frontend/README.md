# Krishi Kalyan frontend

Three portal source folders, one shared library, and one Vite build.

```text
frontend/
|-- Farmer-portal/
|   |-- index.html
|   |-- package.json
|   |-- mobile/                 # Existing mobile placeholder, preserved
|   `-- src/
|       |-- main.jsx            # Farmer HTML entry
|       |-- routes.jsx          # Farmer routes
|       |-- pages/              # Dashboard, booking, queue, tracking, history
|       |-- components/         # Farmer-only calendar
|       |-- assets/             # Imported farmer images/icons/fonts
|       `-- styles/
|           |-- portal.css      # Farmer CSS, including responsive rules
|           `-- tailwind.css    # Farmer and shared Tailwind sources
|-- Admin-portal/
|   |-- index.html
|   |-- package.json
|   `-- src/
|       |-- main.jsx
|       |-- routes.jsx          # Admin-only centers, users, alerts + other pages
|       |-- pages/              # Admin boundaries for reusable management screens
|       |-- assets/
|       `-- styles/
|           |-- portal.css
|           `-- tailwind.css
|-- Procurement-center/
|   |-- index.html
|   |-- package.json
|   `-- src/
|       |-- main.jsx
|       |-- routes.jsx
|       |-- pages/              # Operator screens; Stages.jsx is operator-only
|       |-- assets/
|       `-- styles/
|           |-- portal.css
|           `-- tailwind.css
|-- Shared_with_all_portals/
|   |-- src/
|   |   |-- App.jsx             # Composes portal routes and access guards
|   |   |-- main.jsx            # Root login/portal chooser entry
|   |   |-- mountPortal.jsx     # Common React bootstrap
|   |   |-- routing/
|   |   |-- components/         # Layout, tables, forms, charts, progress widgets
|   |   |-- pages/              # Reused profile, support, notifications, management
|   |   |-- services/           # Shared demo store / future API integration
|   |   |-- data/               # Demo seed records
|   |   |-- assets/
|   |   `-- styles/common.css
|   |-- public/                # Files served unchanged from the site root
|   |-- tests/
|   `-- docs/
|-- index.html                  # Shared portal chooser
|-- package.json
|-- package-lock.json           # One dependency lock for all portals
`-- vite.config.js             # Shared alias, Tailwind, four HTML build entries
```

## Development

Run these commands from `frontend`, not from a portal folder:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Use the URL printed by Vite. The HTML entries are `/Farmer-portal/index.html`,
`/Admin-portal/index.html`, and `/Procurement-center/index.html`. Each preselects
its role when no session exists. Existing routes `/farmer/*`, `/admin/*`,
`/operator/*`, and legacy farmer redirects are retained.

The small portal package files forward dev/build/preview to the root. Install
dependencies only once at the root. Restart old development servers after moving
from the previous directory layout.

## Where changes belong

- Portal-specific HTML, JSX screens, CSS, and assets stay inside that portal.
- Reused features belong in `Shared_with_all_portals`, even if only two portals
  currently use them. Admin and operator management page files re-export shared
  implementations intentionally; they are working pages, not placeholder apps.
- Import shared modules using `@shared/components/...` or `@shared/services/...`.
  Portals should not import each other's private files.
- React page markup lives in `.jsx`; there is no separate HTML file per React
  screen. Each portal does have its own real `index.html` entry.
- Existing CSS was partitioned into shared and role-specific styles. Tailwind v4
  is configured through the Vite plugin and each portal's CSS entry. Use prefixed
  utilities such as `tw:flex` and `tw:gap-4`; no preflight reset is loaded, so
  adding Tailwind does not reset the existing design. See the official
  [Vite setup](https://tailwindcss.com/docs/installation/using-vite) and
  [Preflight guidance](https://tailwindcss.com/docs/preflight).
- Use imports for files in `src/assets`. Static public files are shared at the
  root of the site; never put secrets or private data there.

## Runtime and deployment boundary

This is source organization, not three independently deployed backends or apps.
All entries compose the same role-aware application and share one origin, one
dependency installation, and one `dist` output. Local demo records still use
`krishi-kalyan-v1`; per-tab sessions still use `krishi-session`. Role guards
remain demo UI controls, not production authorization.

Deploy the entire `dist` folder. Configure the host to serve real assets/HTML
first and fall back to `/index.html` for application URLs such as
`/admin/reports`; Vite dev/preview already support this. Deploying a single
portal HTML file alone is not supported.

Backend, AI/ML, database, and project diagrams outside `frontend` are unchanged
by this portal-focused reorganization.
