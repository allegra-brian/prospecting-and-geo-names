// Firebase setup. Keys come from /config.js (gitignored), never from this file.
const V = "13.1.0";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

const { initializeApp } = await import(`${CDN}/firebase-app.js`);
const authMod = await import(`${CDN}/firebase-auth.js`);
const fsMod = await import(`${CDN}/firebase-firestore.js`);
const fnMod = await import(`${CDN}/firebase-functions.js`);

const cfg = window.APP_CONFIG || {};
if (!cfg.firebase || !cfg.firebase.apiKey) {
  throw new Error("missing-config");
}

export const app = initializeApp(cfg.firebase);
export const auth = authMod.getAuth(app);
export const db = fsMod.getFirestore(app);
export const fns = fnMod.getFunctions(app, cfg.functionsRegion || "us-central1");

if (cfg.useEmulators) {
  const host = cfg.emulatorHost || location.hostname;
  authMod.connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  fsMod.connectFirestoreEmulator(db, host, 8080);
  fnMod.connectFunctionsEmulator(fns, host, 5001);
}

export { authMod, fsMod, fnMod };
export const callable = (name, opts) => fnMod.httpsCallable(fns, name, opts);
