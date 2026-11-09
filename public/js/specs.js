// What the interview asks, step by step, and how the Target Profile is edited.

export const INTERVIEW_STEPS = [
  {
    key: "program",
    title: "The program",
    intro: "What are you selling? Describe it the way you'd explain it to a business owner.",
    fields: [
      { path: "program.name", label: "Program name" },
      { path: "program.description", label: "What it is", kind: "textarea" },
      { path: "program.howItWorks", label: "How it works", kind: "textarea", rows: 5 },
    ],
  },
  {
    key: "buyers",
    title: "Who buys it",
    intro: "The kinds of businesses and the people inside them who say yes.",
    fields: [
      { path: "buyers.industries", label: "Industries to target", kind: "lines", rows: 8 },
      { path: "buyers.titles", label: "Decision-maker titles", kind: "lines", help: "One per line, most important first." },
      { path: "buyers.companySize", label: "Company size / type", kind: "textarea", rows: 3 },
    ],
  },
  {
    key: "whyBuy",
    title: "Why they buy",
    intro: "The outcomes they want, and why your program delivers them.",
    fields: [
      { path: "whyBuy.outcomes", label: "Outcomes they want", kind: "lines" },
      { path: "whyBuy.valueProps", label: "Why your program (value props)", kind: "lines" },
    ],
  },
  {
    key: "qualification",
    title: "Good fit / bad fit",
    intro: "Signals that make a business a better prospect, and what rules one out.",
    fields: [
      { path: "qualification.signals", label: "Qualification signals (score higher)", kind: "lines", rows: 6 },
      { path: "qualification.disqualifiers", label: "Disqualifiers (exclude)", kind: "lines", rows: 3 },
      { path: "qualification.routing", label: "Special routing", kind: "lines", rows: 3, help: "One per line, e.g. competitors' clients, current clients." },
    ],
  },
  {
    key: "objections",
    title: "Objections",
    intro: "What do prospects say to push back, and how do you answer?",
    fields: [
      {
        path: "objections",
        label: "Objections and responses",
        kind: "rows",
        addLabel: "Add objection",
        fields: [
          { path: "objection", label: "They say…", kind: "textarea", rows: 2 },
          { path: "response", label: "You answer…", kind: "textarea", rows: 2 },
        ],
      },
    ],
  },
  {
    key: "proof",
    title: "Proof & results",
    intro: "Real results you're allowed to share. The AI only uses what you put here — it never makes up numbers.",
    fields: [
      { path: "proof.points", label: "Proof points", kind: "lines", placeholder: "e.g. A Palatine dental office added 40 new patients in 90 days" },
      { path: "proof.notes", label: "Notes", kind: "textarea", rows: 3 },
    ],
  },
  {
    key: "geography",
    title: "Geography",
    intro: "Where to look for prospects in this campaign.",
    fields: [
      { path: "geography.center", label: "Center (city or address)" },
      { path: "geography.radiusMiles", label: "Radius (miles)", kind: "number", min: 1, max: 500 },
      { path: "geography.zips", label: "Or a list of ZIP codes", kind: "textarea", rows: 2, help: "Optional. Comma-separated." },
      { path: "geography.notes", label: "Notes", kind: "textarea", rows: 2 },
    ],
  },
  {
    key: "offer",
    title: "The call offer",
    intro: "Every message aims at one thing: a booked call. What do they get for their time?",
    fields: [
      { path: "offer.meetingMinutes", label: "Meeting length", kind: "select", options: [[30, "30 minutes"], [15, "15 minutes"]] },
      { path: "offer.whatTheyGet", label: "What they get on the call", kind: "textarea" },
      { path: "offer.cta", label: "Call-to-action wording" },
      { path: "offer.bookingLink", label: "Booking link", type: "url", help: "Optional for now — fill in once you pick a calendar tool." },
      { path: "voice.senderName", label: "Sender name (signs the emails)" },
      { path: "voice.toneNotes", label: "Tone notes", kind: "textarea", rows: 3 },
    ],
  },
];

export const ROW_TEMPLATES = {
  objections: { objection: "", response: "" },
  "targetProfile.industries": { name: "", why: "", priority: "medium" },
  "targetProfile.signals": { signal: "", weight: 3, howToDetect: "" },
  "targetProfile.disqualifiers": { rule: "", howToDetect: "" },
  "targetProfile.routing": { rule: "", track: "cold" },
  "targetProfile.messagingPillars": { pillar: "", angle: "", exampleLine: "" },
  "targetProfile.objections": { objection: "", response: "" },
  "drafts.linkedin.followUps": { dayOffset: 3, message: "" },
};

const PRIORITY = [["high", "High"], ["medium", "Medium"], ["low", "Low"]];
const WEIGHT = [[5, "5 – strongest"], [4, "4"], [3, "3"], [2, "2"], [1, "1 – weakest"]];
const TRACK = [["target", "Target (wanted)"], ["cold", "Cold outreach"], ["upsell", "Upsell track"], ["exclude", "Exclude"]];

export const PROFILE_SECTIONS = [
  { title: "Summary", fields: [{ path: "targetProfile.summary", label: "Who we're going after, in a sentence or two", kind: "textarea" }] },
  {
    title: "Industries & people",
    fields: [
      {
        path: "targetProfile.industries", label: "Industries", kind: "rows", addLabel: "Add industry",
        fields: [
          { path: "name", label: "Industry" },
          { path: "priority", label: "Priority", kind: "select", options: PRIORITY },
          { path: "why", label: "Why they buy", kind: "textarea", rows: 2 },
        ],
      },
      { path: "targetProfile.titles", label: "Decision-maker titles (priority order)", kind: "lines" },
      { path: "targetProfile.companySize", label: "Company size / type", kind: "textarea", rows: 2 },
      { path: "targetProfile.geography", label: "Geography" },
    ],
  },
  {
    title: "Scoring & filters",
    fields: [
      {
        path: "targetProfile.signals", label: "Qualification signals", kind: "rows", addLabel: "Add signal",
        fields: [
          { path: "signal", label: "Signal" },
          { path: "weight", label: "Weight", kind: "select", options: WEIGHT },
          { path: "howToDetect", label: "How to detect it", kind: "textarea", rows: 2 },
        ],
      },
      {
        path: "targetProfile.disqualifiers", label: "Disqualifiers", kind: "rows", addLabel: "Add disqualifier",
        fields: [
          { path: "rule", label: "Rule" },
          { path: "howToDetect", label: "How to detect it", kind: "textarea", rows: 2 },
        ],
      },
      {
        path: "targetProfile.routing", label: "Routing", kind: "rows", addLabel: "Add routing rule",
        fields: [
          { path: "rule", label: "Rule" },
          { path: "track", label: "Send to", kind: "select", options: TRACK },
        ],
      },
    ],
  },
  {
    title: "Messaging",
    fields: [
      {
        path: "targetProfile.messagingPillars", label: "Messaging pillars", kind: "rows", addLabel: "Add pillar",
        fields: [
          { path: "pillar", label: "Pillar" },
          { path: "angle", label: "Angle", kind: "textarea", rows: 2 },
          { path: "exampleLine", label: "Example line", kind: "textarea", rows: 2 },
        ],
      },
      {
        path: "targetProfile.objections", label: "Objections", kind: "rows", addLabel: "Add objection",
        fields: [
          { path: "objection", label: "They say…", kind: "textarea", rows: 2 },
          { path: "response", label: "We answer…", kind: "textarea", rows: 2 },
        ],
      },
      { path: "targetProfile.proofPoints", label: "Proof points", kind: "lines" },
      { path: "targetProfile.toneRules", label: "Tone rules", kind: "lines" },
    ],
  },
  {
    title: "The offer",
    fields: [
      { path: "targetProfile.offer.meetingMinutes", label: "Meeting length", kind: "select", options: [[30, "30 minutes"], [15, "15 minutes"]] },
      { path: "targetProfile.offer.headline", label: "Offer headline" },
      { path: "targetProfile.offer.whatTheyGet", label: "What they get", kind: "textarea", rows: 3 },
      { path: "targetProfile.offer.cta", label: "Call to action" },
    ],
  },
];

// Sample values used to preview merge fields.
export const SAMPLE_MERGE = {
  firstName: "Priya",
  company: "Schaumburg Family Dental",
  city: "Schaumburg",
  industry: "dental",
  bookingLink: "https://calendar.example/brian-30min",
  senderName: "Brian",
};
