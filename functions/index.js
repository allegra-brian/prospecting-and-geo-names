// Allegra Prospector — Cloud Functions (2nd gen)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { generateProgramDrafts, GenerationError } = require("./lib/generate");

initializeApp();
const db = getFirestore();

// Secret Manager: set once with `firebase functions:secrets:set ANTHROPIC_API_KEY`
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
// Plain params: prompted on first deploy, saved in functions/.env.<project>
const ADMIN_EMAILS = defineString("ADMIN_EMAILS", {
  description: "Comma-separated emails that become platform Admin on first verified sign-in",
});
const DEFAULT_TENANT_ID = defineString("DEFAULT_TENANT_ID", { default: "allegra" });

const ROLES = ["admin", "operator", "tenant"];
const REGION = "us-central1";

function requireMember(request) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Please sign in.");
  const { role, tenantId } = auth.token;
  if (!ROLES.includes(role) || !tenantId) {
    throw new HttpsError("permission-denied", "Your account hasn't been given access yet.");
  }
  return { uid: auth.uid, role, tenantId };
}

/**
 * Called by the app right after sign-in. Gives the account its tenant + role
 * (custom claims) the first time. Admin emails must be verified first so no one
 * can claim an admin address by signing up with it.
 */
exports.bootstrapUser = onCall({ region: REGION }, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Please sign in.");

  const user = await getAuth().getUser(auth.uid);
  const claims = user.customClaims || {};
  const email = (user.email || "").toLowerCase();
  const userRef = db.doc(`users/${auth.uid}`);

  if (ROLES.includes(claims.role) && claims.tenantId) {
    return { status: "active", role: claims.role, tenantId: claims.tenantId, refreshToken: false };
  }

  const admins = ADMIN_EMAILS.value()
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (admins.includes(email)) {
    if (!user.emailVerified) {
      return { status: "verify_email" };
    }
    const tenantId = DEFAULT_TENANT_ID.value();
    await getAuth().setCustomUserClaims(auth.uid, { tenantId, role: "admin" });
    const tenantRef = db.doc(`tenants/${tenantId}`);
    await db.runTransaction(async (tx) => {
      const t = await tx.get(tenantRef);
      if (!t.exists) {
        tx.set(tenantRef, {
          tenantId,
          name: "Allegra Marketing • Print • Mail",
          sendingDomain: null, // new cold-sending domain, chosen later
          mailboxes: [],
          bookingLink: null,
          physicalAddress: null, // required for CAN-SPAM before any send
          suppressionListRef: null,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: auth.uid,
        });
      }
      tx.set(
        userRef,
        { uid: auth.uid, email, tenantId, role: "admin", status: "active", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    });
    logger.info("Admin bootstrapped", { uid: auth.uid, tenantId });
    return { status: "active", role: "admin", tenantId, refreshToken: true };
  }

  // Everyone else waits for an admin to grant access (invite flow is Step 5).
  await userRef.set(
    { uid: auth.uid, email, status: "pending", updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { status: "pending" };
});

/**
 * Generate (or regenerate) the Target Profile and first drafts for a program.
 * data: { programId: string, mode: "all" | "drafts" }
 */
exports.generateProgramDrafts = onCall(
  { region: REGION, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    const me = requireMember(request);
    const { programId, mode = "all" } = request.data || {};
    if (typeof programId !== "string" || !programId) {
      throw new HttpsError("invalid-argument", "programId is required.");
    }
    if (!["all", "drafts"].includes(mode)) {
      throw new HttpsError("invalid-argument", "mode must be 'all' or 'drafts'.");
    }

    const ref = db.doc(`programs/${programId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Program not found.");
    const program = snap.data();
    if (me.role !== "admin" && program.tenantId !== me.tenantId) {
      throw new HttpsError("permission-denied", "That program belongs to another tenant.");
    }
    if (mode === "drafts" && !program.targetProfile) {
      throw new HttpsError("failed-precondition", "Generate the Target Profile first.");
    }

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "The AI key isn't set up yet (ANTHROPIC_API_KEY).");
    }

    let result;
    try {
      result = await generateProgramDrafts(program, mode, apiKey);
    } catch (err) {
      if (err instanceof GenerationError) {
        throw new HttpsError("aborted", err.message, { code: err.code });
      }
      logger.error("AI generation failed", err);
      throw new HttpsError("internal", "The AI service had a problem. Please try again in a minute.");
    }

    const update = {
      drafts: { ...result.drafts, approvedAt: null, approvedBy: null },
      generation: {
        by: "claude",
        mode,
        model: result.meta.model,
        warnings: result.warnings,
        at: FieldValue.serverTimestamp(),
        uid: me.uid,
      },
      status: "draft",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (result.targetProfile) update.targetProfile = result.targetProfile;
    await ref.update(update);

    // Append-only cost/event log
    await db.collection("events").add({
      tenantId: program.tenantId,
      type: "ai_generation",
      programId,
      mode,
      model: result.meta.model,
      inputTokens: result.meta.inputTokens,
      outputTokens: result.meta.outputTokens,
      costUsd: result.meta.costUsd,
      uid: me.uid,
      at: FieldValue.serverTimestamp(),
    });

    return { ok: true, warnings: result.warnings, costUsd: result.meta.costUsd };
  }
);
