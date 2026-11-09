// Quick, no-AI drafts built straight from the interview answers.
// Used when the AI key isn't configured yet, or as a fallback if the AI call fails.

const lines = (arr) => (Array.isArray(arr) ? arr.filter((x) => x && String(x).trim()) : []);
const stripSuggested = (s) => String(s || "").replace(/^Suggested:\s*/i, "").replace(/\s*\(Suggested:[^)]*\)\s*/gi, " ").trim();

export function buildTemplateProfile(interview) {
  const i = interview || {};
  const b = i.buyers || {};
  const w = i.whyBuy || {};
  const q = i.qualification || {};
  const o = i.offer || {};
  const g = i.geography || {};
  const p = i.program || {};
  const industries = lines(b.industries);
  const outcomes = lines(w.outcomes);
  const valueProps = lines(w.valueProps);

  return {
    summary: `${p.name || "This program"}: ${stripSuggested(p.description)} Target: ${industries.slice(0, 5).join(", ")}${industries.length > 5 ? " and similar" : ""} within ${g.radiusMiles || "?"} miles of ${g.center || "the pilot area"}.`,
    industries: industries.map((name, idx) => ({
      name,
      why: outcomes[0] ? stripSuggested(outcomes[0]) : "",
      priority: idx < 4 ? "high" : "medium",
    })),
    titles: lines(b.titles),
    companySize: b.companySize || "",
    geography: `${g.center || ""}${g.radiusMiles ? `, ${g.radiusMiles}-mile radius` : ""}${g.zips ? `; ZIPs: ${g.zips}` : ""}`,
    signals: lines(q.signals).map((signal, idx) => ({
      signal,
      weight: idx < 2 ? 5 : idx < 4 ? 4 : 3,
      howToDetect: "",
    })),
    disqualifiers: lines(q.disqualifiers).map((rule) => ({ rule, howToDetect: "" })),
    routing: lines(q.routing).map((rule) => ({
      rule,
      track: /client|customer/i.test(rule) && /suppress|upsell|current/i.test(rule) ? "upsell" : /competitor/i.test(rule) ? "target" : "cold",
    })),
    messagingPillars: valueProps.slice(0, 4).map((vp, idx) => ({
      pillar: vp,
      angle: stripSuggested(outcomes[idx] || outcomes[0] || ""),
      exampleLine: "",
    })),
    objections: (i.objections || [])
      .filter((x) => x && x.objection)
      .map((x) => ({ objection: stripSuggested(x.objection), response: x.response || "" })),
    proofPoints: lines(i.proof?.points),
    offer: {
      meetingMinutes: Number(o.meetingMinutes) === 15 ? 15 : 30,
      headline: `A ${Number(o.meetingMinutes) === 15 ? 15 : 30}-minute local marketing check-in`,
      whatTheyGet: stripSuggested(o.whatTheyGet),
      cta: o.cta || "Book a quick call",
    },
    toneRules: [
      "Intent-based, never surveillance-flavored",
      "Honest subject lines that match the body",
      "Benefit before feature; second person",
      "Under 120 words per email; one call to action",
      "No hype, no jargon, no emoji",
    ],
  };
}

export function buildTemplateDrafts(interview, profile) {
  const i = interview || {};
  const p = i.program || {};
  const minutes = profile?.offer?.meetingMinutes || 30;
  const first = (i.voice?.senderName || "").split(" ")[0] || "{{senderName}}";
  const vp = lines(i.whyBuy?.valueProps);
  const proof = lines(i.proof?.points)[0];
  const obj = (profile?.objections || [])[0];

  const emailSequence = [
    {
      step: 1,
      dayOffset: 0,
      purpose: "Relevant opener + soft ask",
      subject: "More new customers in {{city}}?",
      body: `Hi {{firstName}},

Are you looking for more new customers in {{city}} this year?

We help local {{industry}} businesses reach people right in their own neighborhood — including families who just moved to the area and haven't picked their go-to yet.

Would a ${minutes}-minute call make sense to see if it fits {{company}}? Here's my calendar: {{bookingLink}}

${first}`,
    },
    {
      step: 2,
      dayOffset: 3,
      purpose: "Second angle: new movers",
      subject: "New neighbors near {{company}}",
      body: `Hi {{firstName}},

Every month, new households move in around {{city}}. They need a ${/dent|doctor/i.test(JSON.stringify(i.buyers?.industries)) ? "dentist, an insurance agent, a go-to HVAC company" : "new set of local businesses"} — and the first ones they hear from tend to win.

${p.name || "Our program"} puts {{company}} in front of them early. ${vp[0] ? vp[0] + "." : ""}${proof ? `\n\n${proof}` : ""}

Worth a quick ${minutes}-minute look? {{bookingLink}}

${first}`,
    },
    {
      step: 3,
      dayOffset: 7,
      purpose: "Handle the top objection",
      subject: "If you already advertise",
      body: `Hi {{firstName}},

${obj ? `A lot of owners tell me, "${obj.objection.replace(/\.$/, "")}." ${obj.response}` : "If you already advertise, this is designed to work alongside what you're doing."}

The call is simply a look at your area and what's possible — no commitment, and you'll leave with ideas either way.

${minutes === 30 ? "30 minutes (or even 15)" : "15 minutes"}: {{bookingLink}}

${first}`,
    },
    {
      step: 4,
      dayOffset: 14,
      purpose: "Polite break-up",
      subject: "Should I close the loop?",
      body: `Hi {{firstName}},

I haven't heard back, so I'll assume the timing isn't right — no problem at all.

If bringing in more local customers for {{company}} moves up the list, my calendar is here anytime: {{bookingLink}}

Thanks,
${first}`,
    },
  ];

  const linkedin = {
    connectNote: `Hi {{firstName}} — I work with local businesses around ${i.geography?.center || "the area"} on marketing and always like connecting with owners in the community. Would be glad to connect.`,
    hookIdeas: [
      "Recent post or company update (new location, hiring, anniversary)",
      "Shared local groups, chambers or associations",
      "Mutual connections in the local business community",
      "A recent review or award they mentioned",
    ],
    followUps: [
      {
        dayOffset: 2,
        message: "Thanks for connecting, {{firstName}}. Always good to know more business owners nearby. How's the year going for {{company}}?",
      },
      {
        dayOffset: 7,
        message: `Quick one — we've been helping local ${"{{industry}}"} businesses reach new movers and nearby customers. If that's ever useful, happy to do a ${minutes}-minute call: {{bookingLink}}`,
      },
    ],
  };

  return { emailSequence, linkedin };
}
