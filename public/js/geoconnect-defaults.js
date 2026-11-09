// Pre-filled interview answers for the GeoConnect program (from PROJECT_BRIEF §2-3).
// Anything marked "Suggested:" is a starting point for Brian to confirm or replace.

export const GEOCONNECT_INTERVIEW = {
  program: {
    name: "GeoConnect",
    description:
      "Allegra's geofencing ad program: digital ads shown on phones to people in or near the places that matter to a local business — its neighborhood, competitors' locations, events — and to new movers in its area.",
    howItWorks:
      "We draw virtual boundaries around chosen locations and serve the business's ads to people who are in those areas, and to households that recently moved nearby. Ads run across apps and websites, and we report on results. (Suggested: confirm or edit how you describe setup, reporting and minimum spend.)",
  },
  buyers: {
    industries: [
      "Insurance agencies",
      "Restaurants",
      "Doctors",
      "Dentists",
      "HVAC",
      "Plumbing",
      "Electrical",
      "Roofing",
      "Landscaping",
      "Any business that could use new-mover marketing",
    ],
    titles: ["Owner", "Marketing Manager", "Office Manager", "VP Sales & Marketing"],
    companySize:
      "B2C local businesses with a fixed location and a real website; independent operators who control their own marketing budget.",
  },
  whyBuy: {
    outcomes: [
      "More new customers / new patients from their own trade area",
      "Reach new movers before they pick a dentist, insurer, HVAC company or favorite restaurant",
      "Win customers who are visiting competitors",
      "Be seen locally without wasting budget on people outside their area",
    ],
    valueProps: [
      "Targets by real-world location, not just keywords",
      "New-mover targeting — reach households as soon as they arrive",
      "Pairs with Allegra print and mail for a combined local campaign",
      "A local partner in Palatine, not a faceless ad platform",
    ],
  },
  qualification: {
    signals: [
      "Already spending on ads (Google Ads presence, Meta/Yelp ads)",
      "Multiple locations",
      "Recently opened or expanding",
      "Review volume (strong = has budget; weak-but-active = needs help)",
      "Has a real website",
      "Currently hiring",
    ],
    disqualifiers: [
      "Franchise-controlled marketing (local operator cannot buy marketing independently)",
      "Too small: solo operator, no fixed location, or no website and no reviews",
    ],
    routing: [
      "Competitors' clients are wanted targets, not exclusions",
      "Current Allegra clients are suppressed from cold outreach and routed to a separate 'upsell GeoConnect' track",
    ],
  },
  objections: [
    {
      objection: "Suggested: We already run Google Ads.",
      response:
        "Google reaches people already searching. GeoConnect reaches people near you, and new movers, before they search — it complements search instead of replacing it.",
    },
    {
      objection: "Suggested: We tried digital ads before and they didn't work.",
      response:
        "Fair. The call is to look at what you tried and whether location targeting fits your business — no commitment.",
    },
    {
      objection: "Suggested: It's too expensive for a business our size.",
      response: "Budgets can start small and focus on a tight radius. The call is about whether it fits your numbers.",
    },
    {
      objection: "Suggested: Corporate / our franchisor handles marketing.",
      response: "Understood — if local marketing decisions aren't yours to make, we'll step back.",
    },
  ],
  proof: {
    points: [],
    notes:
      "Add real GeoConnect results here (e.g. a client result you're allowed to share). The AI only uses proof you enter — it will not make up numbers.",
  },
  geography: {
    center: "Palatine, IL",
    radiusMiles: 25,
    zips: "",
    notes: "Pilot area. Nationwide later.",
  },
  offer: {
    meetingMinutes: 30,
    whatTheyGet:
      "Suggested: A quick look at where their best customers are, which nearby areas and new-mover households we could reach, and a sample campaign plan with a budget range.",
    cta: "Grab a 30-minute call (15 works too)",
    bookingLink: "",
  },
  voice: {
    senderName: "Brian Walsh",
    companyName: "Allegra Marketing • Print • Mail",
    toneNotes:
      "Friendly, local, plain-spoken. Intent-based (\"looking for more new patients in Schaumburg?\"), never surveillance-flavored. No hype, no emoji.",
  },
};

export const GEOCONNECT_PROGRAM_NAME = "GeoConnect";
