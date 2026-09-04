# Admin portal

Owns the admin HTML entry, admin route definitions, page boundaries, assets, and
CSS/Tailwind entries. Admin-only routes include centers, alerts, and users.
Reusable management, reports, and settings implementations are imported from
`@shared`; this keeps fixes consistent with the operator portal.

Install dependencies from `frontend` using `npm ci`, then run `npm run dev`.
Open `/Admin-portal/index.html` or choose Admin on the shared login page.
See [the frontend guide](../README.md) for deployment and shared-code boundaries.
