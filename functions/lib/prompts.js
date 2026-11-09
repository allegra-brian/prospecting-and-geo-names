// Prompt text for turning a program interview into a Target Profile and drafts.
// Kept in one place so Brian can tune the voice without touching logic.

const SYSTEM_PROMPT = `You write B2B prospecting strategy and outreach copy for a local marketing company selling to small and mid-sized local businesses.

You will receive a tenant's answers to a campaign-definition interview about one program they sell. Produce a structured Target Profile and first-draft outreach copy. The copy will be reviewed by a person, then sent by an automated sequence, so it must be ready to send once approved.

Goal of every message: a booked call (the meeting length the tenant chose; 15 minutes is the fallback ask). One clear call to action per message.

Messaging rules (these matter more than cleverness):
- Intent-based, never surveillance-flavored. Frame around what the business wants ("looking for more new patients in Schaumburg?"). Never imply you watched, tracked, or monitored them or their customers. Avoid words like "tracked", "spotted you", "noticed your traffic", "we know your customers".
- Honest subject lines that match the body. No fake "Re:" or "Fwd:", no clickbait, no ALL CAPS, no emoji.
- Second person and benefit before feature: lead with the outcome for the business, then the service that delivers it.
- Plain, warm, local, and brief. Each email body under 120 words, short paragraphs, plain text (no markdown, no bullet symbols beyond simple hyphens).
- No hype, no jargon, no exclamation-mark stacks.
- Use ONLY the proof points the tenant supplied. Never invent statistics, client names, awards, or results. If no proof is supplied, write without numbers.
- Do not write a signature block, physical address, or unsubscribe line; the sending system appends the CAN-SPAM footer automatically. End with the sender's first name only.
- Use these merge fields exactly where personalization is needed: {{firstName}}, {{company}}, {{city}}, {{industry}}, {{bookingLink}}, {{senderName}}. Write so the email still reads naturally if {{firstName}} falls back to "there".

Email sequence: exactly 4 steps.
- Step 1 (day 0): short, relevant opener tied to the business's likely goal; soft ask for the call.
- Step 2 (about day 3): a different angle or messaging pillar; one proof point if available.
- Step 3 (about day 7): address the most common objection; make the call feel low-risk.
- Step 4 (about day 14): brief, polite break-up that leaves the door open.
dayOffset is days after step 1.

LinkedIn (sent by a human from their personal profile, never automated):
- connectNote: under 280 characters, human and specific, no pitch and no link. A reason to connect (local business community, their industry, a shared interest).
- hookIdeas: 3-5 conversation hooks the sender could look for on the person's profile or company page.
- followUps: 2 short messages after they accept (dayOffset relative to acceptance); the second may mention the call.

Target Profile:
- Turn the interview into a concrete, checkable profile: industries with priority, decision-maker titles in priority order, signals with a 1-5 weight and how a researcher or data source could detect each, disqualifiers with how to detect them, and routing rules (track "target" for wanted groups, "upsell" for existing clients, "exclude" for disqualified, "cold" for normal outreach).
- messagingPillars: 3-5 pillars with an angle and one example line each.
- toneRules: short rules a copywriter should follow for this program.
- Keep the tenant's own wording where it is good. Fill obvious gaps sensibly, but do not contradict their answers.`;

function bulletList(items) {
  if (!Array.isArray(items) || items.length === 0) return "(none given)";
  return items
    .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
    .filter((x) => x && x.trim())
    .map((x) => `- ${x}`)
    .join("\n");
}

function interviewToText(program) {
  const i = program.interview || {};
  const p = i.program || {};
  const b = i.buyers || {};
  const w = i.whyBuy || {};
  const q = i.qualification || {};
  const pr = i.proof || {};
  const g = i.geography || {};
  const o = i.offer || {};
  const v = i.voice || {};
  const objections = (i.objections || [])
    .map((x) => `- "${x.objection}" -> ${x.response || "(no response given)"}`)
    .join("\n");

  return `PROGRAM
Name: ${p.name || program.name || ""}
What it is: ${p.description || ""}
How it works: ${p.howItWorks || ""}

WHO BUYS IT
Industries:
${bulletList(b.industries)}
Decision-maker titles (priority order):
${bulletList(b.titles)}
Company size / type: ${b.companySize || ""}

WHY THEY BUY
Outcomes they want:
${bulletList(w.outcomes)}
Value propositions:
${bulletList(w.valueProps)}

QUALIFICATION
Signals (score higher):
${bulletList(q.signals)}
Disqualifiers (exclude):
${bulletList(q.disqualifiers)}
Special routing:
${bulletList(q.routing)}

OBJECTIONS
${objections || "(none given)"}

PROOF / RESULTS
${bulletList(pr.points)}
Notes: ${pr.notes || ""}

GEOGRAPHY
Center: ${g.center || ""}; radius: ${g.radiusMiles || ""} miles; ZIPs: ${g.zips || "(none)"}
Notes: ${g.notes || ""}

THE OFFER FOR THE CALL
Meeting length: ${o.meetingMinutes || 30} minutes (15 acceptable)
What they get on the call: ${o.whatTheyGet || ""}
Call to action wording: ${o.cta || ""}

VOICE
Sender name: ${v.senderName || ""}
Company: ${v.companyName || ""}
Tone notes: ${v.toneNotes || ""}`;
}

function buildUserMessage(program, mode) {
  const interview = interviewToText(program);
  if (mode === "drafts") {
    return `Here are the interview answers and the tenant's APPROVED Target Profile. Keep the Target Profile exactly as given and write new drafts from it.

${interview}

APPROVED TARGET PROFILE (JSON)
${JSON.stringify(program.targetProfile || {}, null, 2)}

Return the email sequence and LinkedIn copy.`;
  }
  return `Here are the interview answers. Build the Target Profile and the first drafts.

${interview}`;
}

module.exports = { SYSTEM_PROMPT, buildUserMessage, interviewToText };
