# allegra-prospector — Project Brief

**Read this file in full before doing anything. Then start with Step 1 under "Build Order."**

Owner: Brian Walsh, Allegra Marketing Print & Mail (Palatine, IL). Brian is a non-developer who ships Firebase apps with Claude Code. Explain decisions briefly, ask one question at a time when something is ambiguous, and do not ask about things already settled in this document.

---

## 1. What we are building

A multi-tenant AI prospecting and outreach platform. A "tenant" (first one: Allegra) defines a **program** to sell (first one: GeoConnect, Allegra's geofencing ad product). The system:

1. Interviews the tenant about the program and campaign goals and produces a **target profile**.
2. Finds matching businesses in a geography, enriches them with decision-maker name and email, scores and filters them.
3. Runs an **unattended drip sequence** (email primary, optional physical-mail touch, LinkedIn as a human-sent queue) whose goal is a **booked 30-minute call** (15 acceptable).
4. Tracks replies, bookings, and outcomes in a lightweight built-in CRM.

Later (not now): a second lead source — website-visitor identification from GeoConnect landing pages (names/emails/postal from a pixel vendor such as LeadPost) — feeds the same CRM and sequences. Design data models so a lead can come from any source. Do not build the pixel module yet.

Pilot: Allegra as tenant, selling GeoConnect to businesses within ~25 miles of Palatine, IL. Later: nationwide, and customer-facing with logins for other businesses (Brian intends to offer this as a service through a separate AI consulting venture).

## 2. Target audience (GeoConnect program)

B2C businesses that benefit from location-based or new-mover marketing:
- Insurance agencies
- Restaurants
- Doctors and dentists
- HVAC
- Tradesmen (plumbing, electrical, roofing, landscaping, etc.)
- Any business that could use new-mover marketing

Decision-maker titles, in priority order: Owner, Marketing Manager, Office Manager, VP Sales & Marketing.

### Qualification signals (score higher)
- Already spending on ads (Google Ads presence, Meta/Yelp ads)
- Multiple locations
- Recently opened or expanding
- Review volume (both strong = has budget, and weak-but-active = needs help are acceptable; tune later)
- Has a real website
- Currently hiring

### Disqualifiers (exclude)
- Franchise-controlled marketing (local operator cannot buy marketing independently)
- Too small (solo operator / no fixed location / no website and no reviews)

### Special routing
- **Competitors' clients are wanted targets**, not exclusions.
- **Current Allegra clients are suppressed from cold outreach** and routed to a separate "upsell GeoConnect" track. Suppression list is tenant-supplied (CSV upload at first; PrintSmith Vision / PlanProphet import later).

## 3. Channels and rules

### Email (primary, unattended)
- Sends from a **new, dedicated domain** — never allegrapalatine.net. Brian will register the domain and create Google Workspace mailbox(es) (~$7/mo each) when asked.
- Use a sequencing/warm-up provider with an API (Instantly or Smartlead, ~$35–40/mo) for sending, warm-up, bounce/reply detection. Our app owns the CRM, scoring, message generation, and sequence logic; the provider is the delivery layer. Keep the provider behind an adapter so it can be swapped.
- Once templates are approved, sequences run **without per-send approval**. Replies are classified (interested / not now / unsubscribe / out-of-office / wrong person) and routed; interested replies get a booking link and a notification to Brian.
- CAN-SPAM compliance: physical address, working unsubscribe, honest subject lines.
- Messaging is **intent-based** ("looking for more new patients in Schaumburg?"), never surveillance-flavored.

### LinkedIn (human-sent queue, never automated)
- Brian's real profile only. No automation tools, no new profiles (LinkedIn flags both).
- The system finds the right person, mutual connections, and a conversation hook, and writes the connect note and follow-ups. It produces a daily queue that Brian (or his VA, Paul) sends manually in a few minutes. Track sent/accepted/replied by manual check-off.

### Physical mail (optional sequence step)
- A sequence step that outputs a postcard/letter job (recipient data + copy) into a CSV/export for Allegra's normal production workflow. No print-status tracking in this app — PrintSmith Vision owns that.

## 4. Data stack (pilot budget ≈ $50/month, scale up only if it books calls)

Do **not** use seat-based subscriptions (Apollo, ContactOut, Sales Navigator, ZoomInfo). Pay-per-result only.

| Need | Approach | Approx. cost |
|---|---|---|
| Business discovery | Outscraper or Apify Google Maps actor (not the official Places API — ~10x pricier). Pull name, address, phone, website, rating, review count, categories, hours, photos count, and ad indicators. | $1–14 per 1,000 businesses |
| Owner / decision-maker name | Free public sources first: Illinois Secretary of State business entity search (officers), IDFPR license lookup (dentists, physicians, insurance producers, roofers), IDPH (plumbers); business website About/Team page; Google Business Profile owner responses. | $0 |
| Email | Pattern-guess (owner@, firstname@, first.last@ on the business domain) + verification first; then pay-per-verified finders charged only on hits: Anymail Finder (from $14/mo), emailfinder.dev (~€0.009/verified, no subscription), Icypeas ($19, credits never expire). Waterfall: cheapest first. | ~$0.01–0.03 per found email |
| Email verification | Bundled with finders above, or a PAYG verifier (Kickbox/ZeroBounce ~ $0.003–0.008 each). | negligible |
| Sending | Instantly or Smartlead via API, plus 1–2 Google Workspace mailboxes on the new domain. | ~$40–50/mo total |
| Phone (optional, later) | Mobile numbers cost ~10x an email; skip for pilot. | — |

Cache everything in Firestore so no business or person is paid for twice across tenants.

## 5. Tech stack and Brian's standing conventions (mandatory)

- **Firebase**: Hosting (single-page app), Firestore, 2nd-gen Cloud Functions, Firebase Auth, Secret Manager, Cloud Scheduler for the drip engine. Same shape as his existing projects (e.g., groundtruth-reporting-91260).
- **Multi-tenant from day one**: every document carries `tenantId`; Firestore rules enforce it. Roles: Admin (Brian), Operator, Tenant User. Allegra is tenant #1.
- **config.js pattern**: API keys/secrets live in a separate `config.js` (`window.APP_CONFIG = {...}`) that is gitignored and injected once; never inline in `index.html`. Server-side secrets go in Secret Manager.
- **Working folder**: `Z:\A\Allegra Stuff\APPS\allegra-prospector\` (network drive, Windows).
- **Deploy**: `firebase deploy --only hosting` for the front end; functions deployed separately.
- **Version tag**: small version label at the bottom of every page (e.g., `· v3`); bump every build.
- **Skills**: any Claude Code skills created for this project go in `.claude/skills/<name>/SKILL.md` and must be named with the `allegra-` prefix (e.g., `allegra-prospector-deploy`).
- **Keys via PowerShell**: when a key must be entered, use `$key = Read-Host` (press Enter first, wait for the prompt, then paste).
- Keep the UI simple and operator-friendly; Brian uses it on desktop and phone.

## 6. Data model (starting point — refine as needed)

- `tenants/{tenantId}`: name, sending domain, mailbox config, booking link, physical address (CAN-SPAM), suppression list ref
- `programs/{programId}`: tenantId, name (GeoConnect), interview answers, target profile, value props, proof points
- `campaigns/{campaignId}`: programId, geography (center + radius or list of ZIPs), industries, status, daily send cap
- `businesses/{businessId}`: shared cache keyed by Google place_id; raw discovery data; enrichment status; score; signals
- `contacts/{contactId}`: businessId, name, title, email, email_status, linkedin_url, source, cost
- `leads/{leadId}`: tenantId, campaignId, contactId, track (cold | upsell), stage, sequence state, next_action_at
- `sequences/{sequenceId}`: steps (channel, delay, template), per campaign
- `events/{eventId}`: sends, opens/replies, LinkedIn check-offs, bookings, costs — append-only
- `queues/linkedin/{tenantId}`: today's human-send items

## 7. Build order

Work in this order. Finish and show each step before starting the next. Keep a running `CHANGELOG.md`.

**Step 1 — Campaign-definition interview + target profile (start here).**
A guided interview (chat-style UI or form) that asks the tenant about the program: what it is, who buys it, why they buy, objections, proof/results, geography, offer for the call. It outputs a structured **Target Profile** document (industries, titles, signals, disqualifiers, messaging pillars, offer) stored on the program and editable. Pre-fill the GeoConnect answers from Section 2 of this brief so Brian only confirms/edits. Also generate a first-draft 4-step email sequence and a LinkedIn connect note from the profile.

**Step 2 — Discovery + enrichment pipeline.**
Given a campaign (geography + industries), pull businesses via Outscraper/Apify, dedupe into the shared cache, run free owner-name lookups, then the email waterfall, then scoring. Apply disqualifiers and the tenant suppression list; route matches to the upsell track. Show cost-per-qualified-lead on the dashboard. Hard daily spend cap with a kill switch.

**Step 3 — Sequence engine + sending.**
Integrate the sending provider behind an adapter. Scheduler advances leads through steps, respects send windows and daily caps, ingests replies, classifies them, pauses on reply/unsubscribe, surfaces interested replies with a booking link. LinkedIn steps go to the human queue; mail steps export a CSV.

**Step 4 — Outcome tracking.**
Booked calls (manual mark or calendar webhook), won/lost, revenue attributed. Dashboard: leads by stage, reply rate, booking rate, cost per booked call, by industry.

**Step 5 — Multi-tenant hardening and customer-facing logins.**
Tenant onboarding flow, billing hooks (not implemented, just designed), per-tenant mailbox connection, white-label basics. Allegra remains tenant #1.

## 8. Open items (do not block Step 1)

- Domain name for cold sending — Brian to choose and register.
- Sending provider choice (Instantly vs Smartlead) — pick when Step 3 starts; compare API quality then.
- Visitor-ID pixel module — waiting on GroundTruth (contact: Lucas Sperduti) re: pixel on hosted landing pages, and a LeadPost partner trial. Future module only.
- Calendar/booking tool for the "win" event — Brian to confirm what he uses.

## 9. What Brian wants from the first Claude Code session

1. Confirm the repo and folder are set up at the working path above, with `.gitignore` covering `config.js`, `node_modules`, `.firebase`.
2. Scaffold the Firebase project (Hosting + Functions + Firestore + Auth) and verify `firebase deploy --only hosting` works with a placeholder page carrying `· v1`.
3. Build Step 1 end to end and demo it with the GeoConnect program.
