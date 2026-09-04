# Frontend validation — 4 September 2026

## Runtime and build

- Existing React 18, Vite, React Router and Lucide dependencies retained.
- `npm run dev` from the frontend root starts the existing nested Vite application at http://127.0.0.1:5173.
- Production build passes; JavaScript, JSX and imports compile successfully.
- All 36 portal pages were exercised via browser navigation. Login, role redirects and logout were checked separately.
- Browser console checks across the three portals returned no runtime errors.

## Verified workflows

- Farmer rescheduling changes the slot and preserves the token number.
- New booking generates a token after center, date, slot and crop confirmation.
- Cancellation updates booking availability and history.
- Operator check-in changes the token to Checked In.
- Sequential stage updates proceed through verification, quality checking, weighing and completion.
- Accepted weight of 19 quintals yields a payment amount of ₹40,375 at the demo rate.
- Operator payment update to Paid appears in the farmer payment tracker after switching roles.
- Profile saving, notification filtering and marking notifications as read work.
- Farmer ticket creation appears in the admin helpdesk; admin reply and resolution persist.
- Admin add-center workflow, table search, status filtering and pagination work.
- Reports export a local CSV; the downloaded file was inspected and contained the expected payment rows and amount.
- A farmer navigating directly to an admin URL is redirected to the farmer dashboard.
- Mobile sidebar toggle works. Farmer booking/payment, admin dashboard/reports and operator dashboard/settings were checked at a 390 × 844 viewport without page-level horizontal overflow.
- Switching procurement centers updates the operator center-settings form.
- A zero-value donut-segment rendering issue was fixed during visual inspection.

## Scope

This is a frontend demonstration with local persistence and per-tab demo sessions. No external payment, messaging or authentication services are invoked. Historical line-chart data is illustrative. Language selection stores a preference; translation remains an integration task. Native file inputs enforce image type and size constraints in application code; file upload and production credential handling were not exercised in browser validation.
