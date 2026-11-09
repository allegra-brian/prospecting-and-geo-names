---
name: allegra-prospector-deploy
description: Deploy Allegra Prospector to Firebase (hosting, functions, Firestore rules) from Brian's Windows machine, bumping the version tag first.
---

# Deploy Allegra Prospector

Run from `Z:\A\Allegra Stuff\APPS\allegra-prospector\` in PowerShell.

1. **Bump the version tag.** In `public/index.html`, change `Allegra Prospector · vN` in the footer to the next number. Add a matching entry at the top of `CHANGELOG.md`.
2. **Check `public/config.js` exists** (gitignored). If it doesn't, copy `public/config.example.js` to it and fill in the Firebase web-app values.
3. **Deploy what changed:**
   - Front end only: `firebase deploy --only hosting`
   - Firestore rules/indexes: `firebase deploy --only firestore`
   - Functions: `cd functions; npm install; cd ..; firebase deploy --only functions`
4. **Smoke test.** Open the hosting URL, check that the footer shows the new version, sign in, and open the GeoConnect program.
5. Commit and push.

## Setting the AI key (one time, or to rotate it)
```powershell
$key = Read-Host "Paste Anthropic API key"
$key | firebase functions:secrets:set ANTHROPIC_API_KEY --data-file=-
firebase deploy --only functions
```
(Press Enter after typing the first line, wait for the prompt, then paste.)
