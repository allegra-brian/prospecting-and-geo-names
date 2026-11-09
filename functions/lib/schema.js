// JSON schema for the AI-generated Target Profile + drafts.
// Used as the Claude structured-output format AND to validate what we store.

const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const TARGET_PROFILE_SCHEMA = obj({
  summary: str,
  industries: {
    type: "array",
    items: obj({
      name: str,
      why: str,
      priority: { type: "string", enum: ["high", "medium", "low"] },
    }),
  },
  titles: strArr,
  companySize: str,
  geography: str,
  signals: {
    type: "array",
    items: obj({
      signal: str,
      weight: { type: "integer", enum: [1, 2, 3, 4, 5] },
      howToDetect: str,
    }),
  },
  disqualifiers: { type: "array", items: obj({ rule: str, howToDetect: str }) },
  routing: {
    type: "array",
    items: obj({
      rule: str,
      track: { type: "string", enum: ["target", "cold", "upsell", "exclude"] },
    }),
  },
  messagingPillars: { type: "array", items: obj({ pillar: str, angle: str, exampleLine: str }) },
  objections: { type: "array", items: obj({ objection: str, response: str }) },
  proofPoints: strArr,
  offer: obj({
    meetingMinutes: { type: "integer", enum: [15, 30] },
    headline: str,
    whatTheyGet: str,
    cta: str,
  }),
  toneRules: strArr,
});

const EMAIL_STEP_SCHEMA = obj({
  step: { type: "integer", enum: [1, 2, 3, 4] },
  dayOffset: { type: "integer" },
  purpose: str,
  subject: str,
  body: str,
});

const DRAFTS_SCHEMA = obj({
  emailSequence: { type: "array", items: EMAIL_STEP_SCHEMA },
  linkedin: obj({
    connectNote: str,
    hookIdeas: strArr,
    followUps: { type: "array", items: obj({ dayOffset: { type: "integer" }, message: str }) },
  }),
});

// Full generation (profile + drafts) and drafts-only (profile already edited).
const FULL_OUTPUT_SCHEMA = obj({
  targetProfile: TARGET_PROFILE_SCHEMA,
  emailSequence: DRAFTS_SCHEMA.properties.emailSequence,
  linkedin: DRAFTS_SCHEMA.properties.linkedin,
});

const LINKEDIN_NOTE_MAX = 300; // LinkedIn's hard limit for connection notes

// Light sanity checks on top of the schema; returns a list of warnings.
function checkDrafts(out) {
  const warnings = [];
  const seq = out.emailSequence || [];
  if (seq.length !== 4) warnings.push(`Expected 4 emails, got ${seq.length}.`);
  seq.forEach((e, i) => {
    if (!e.subject || !e.body) warnings.push(`Email ${i + 1} is missing a subject or body.`);
    const words = (e.body || "").split(/\s+/).filter(Boolean).length;
    if (words > 160) warnings.push(`Email ${i + 1} is long (${words} words).`);
  });
  const note = out.linkedin?.connectNote || "";
  if (note.length > LINKEDIN_NOTE_MAX) {
    warnings.push(`LinkedIn note is ${note.length} characters (limit ${LINKEDIN_NOTE_MAX}).`);
  }
  return warnings;
}

module.exports = {
  TARGET_PROFILE_SCHEMA,
  DRAFTS_SCHEMA,
  FULL_OUTPUT_SCHEMA,
  LINKEDIN_NOTE_MAX,
  checkDrafts,
};
