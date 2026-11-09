# Allegra Prospector

Multi-tenant AI prospecting and outreach platform. Tenant #1 is Allegra Marketing • Print • Mail, selling GeoConnect. See `PROJECT_BRIEF.md` for the full plan and `CHANGELOG.md` for what's built.

**Built so far:** Step 1. That covers the campaign-definition interview, the Target Profile, the 4-step email sequence and the LinkedIn connect note.

## Folder layout
```
public/                 Front end (Firebase Hosting, plain HTML/CSS/JS, no build step)
  index.html            App shell, version tag in the footer
  config.example.js     Copy to config.js (gitignored) and fill in Firebase web keys
  css/app.css           Allegra Design System styles
  js/                   app.js (screens), fields.js, specs.js (interview questions),
                        geoconnect-defaults.js (pre-fill), template-drafts.js (no-AI fallback)
functions/              Cloud Functions (2nd gen, Node 22)
  index.js              bootstrapUser, generateProgramDrafts
  lib/                  prompts.js (AI voice rules), schema.js, generate.js
firestore.rules         Tenant isolation rules
.claude/skills/         allegra-prospector-deploy
```

## First-time setup (Windows / PowerShell)

1. **Get the code** into `Z:\A\Allegra Stuff\APPS\allegra-prospector\`:
   ```powershell
   cd "Z:\A\Allegra Stuff\APPS"
   git clone https://github.com/allegra-brian/prospecting-and-geo-names allegra-prospector
   cd allegra-prospector
   git checkout claude/kind-euler-jnsr5v
   ```
2. **Create the Firebase project** at console.firebase.google.com. Name it e.g. `allegra-prospector`. If Firebase gives it a different project ID, put that ID in `.firebaserc`.
   - Upgrade to the **Blaze** plan. Cloud Functions and Secret Manager need it. Cost at pilot volume should be near zero.
   - **Authentication → Sign-in method →** enable **Email/Password**.
   - **Firestore Database →** create it (production mode, `us-central`).
   - **Project settings → Your apps → Add web app.** Copy the config values.
3. **Front-end keys:** copy `public\config.example.js` to `public\config.js` and paste in the web-app values. This file is gitignored.
4. **Install and log in:**
   ```powershell
   npm install -g firebase-tools
   firebase login
   cd functions; npm install; cd ..
   ```
5. **AI key** (Anthropic). It goes into Secret Manager:
   ```powershell
   $key = Read-Host "Paste Anthropic API key"
   $key | firebase functions:secrets:set ANTHROPIC_API_KEY --data-file=-
   ```
   (Press Enter after typing the first line, wait for the prompt, then paste.)
6. **Deploy.** On the first functions deploy, Firebase asks for `ADMIN_EMAILS` (your email) and `DEFAULT_TENANT_ID` (press Enter to accept `allegra`).
   ```powershell
   firebase deploy --only hosting
   firebase deploy --only firestore
   firebase deploy --only functions
   ```
7. Open the hosting URL. **Create an account** with your admin email, click the link in the verification email, then press **I've verified my email**. You're now Admin of tenant `allegra`.

## Using Step 1
1. **Programs → Start GeoConnect interview.** Eight short screens, pre-filled from the brief. Edit anything marked "Suggested:". Add real proof points if you have them.
2. **Review → Generate with AI.** It takes about 1–2 minutes. Or use **Quick template draft** if the AI key isn't set yet.
3. Edit the **Target Profile**, the **Email sequence** (use Preview to see the merge fields filled in) and the **LinkedIn** note.
4. **Approve templates** when they're ready. In Step 3, approved templates send without per-email approval.

## Local testing (optional)
Set `useEmulators: true` in `public/config.js`, put `ADMIN_EMAILS=...` in `functions/.env.local`, then run:
```powershell
firebase emulators:start
```
and open http://localhost:5000.

## Conventions
- Every document carries `tenantId`. Firestore rules enforce it.
- Secrets never go in `index.html`. Browser keys live in `config.js`; server keys live in Secret Manager.
- Bump the footer version (`· vN`) and `CHANGELOG.md` with every build.
