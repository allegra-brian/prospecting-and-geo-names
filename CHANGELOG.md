# Changelog — allegra-prospector

## v2 — Step 1: Campaign-definition interview + Target Profile
- Email + password sign-in (with email verification and password reset). The first verified sign-in from an email in `ADMIN_EMAILS` becomes platform **Admin** of tenant `allegra` (custom claims `{tenantId, role}`); the tenant doc is created automatically. Everyone else lands on "Waiting for access" until the invite flow (Step 5).
- Programs list per tenant, with a one-click **Start GeoConnect interview**, pre-filled from PROJECT_BRIEF §2–3. Answers the brief didn't settle are marked "Suggested:"; proof points are left blank on purpose (the AI never makes up results).
- 8-step interview (program, who buys, why they buy, fit/disqualifiers/routing, objections, proof, geography, call offer) plus a review step. It saves on every step and works on phone and desktop.
- **Generate with AI**: the Cloud Function `generateProgramDrafts` (Claude, key in Secret Manager) writes a structured **Target Profile** (industries, titles, weighted signals, disqualifiers, routing tracks, messaging pillars, objections, proof, offer, tone rules), a **4-step email sequence** and a **LinkedIn connect note + follow-ups**. Each run's token cost is logged to `events` (append-only).
- **Quick template draft (no AI)** fallback, for when the AI key isn't set or a call fails.
- Editable Target Profile, email sequence (with merge-field preview and a CAN-SPAM footer preview), and LinkedIn tab (300-character counter). "Rewrite drafts from this profile" re-runs the AI after profile edits.
- **Approve templates** records who approved and when. Editing an approved template sends it back to draft.
- Firestore rules: every tenant-owned doc is scoped by `tenantId`. Roles are admin, operator and tenant. Events are append-only, and the shared `businesses`/`contacts` cache is function-write-only.
- Allegra Design System look: purple top band, Roboto/Caveat, square-ish corners, brand arrow on primary actions.

## v1 — Scaffold
- Firebase project scaffold (Hosting, Functions 2nd gen, Firestore, Auth) and a placeholder page tagged `· v1` to verify `firebase deploy --only hosting`.
- `.gitignore` covers `config.js`, `node_modules`, `.firebase`.

### Data model notes
- Step 1 drafts are stored on `programs/{id}` as templates (`drafts.emailSequence`, `drafts.linkedin`). In Step 3 a campaign copies them into `sequences/{id}`.
