# LinkedIn: keep the human part tiny (decided 2026-11-10)

**Decision:** LinkedIn stays human-sent from Brian's real profile. No automation tools, no
cloud-sender services (e.g. Yoke, Expandi, HeyReach), and no Sales Navigator seat. The app does
everything except the final tap, so sending takes a few minutes a day on a phone.

**Why:** LinkedIn's help center says it does not allow third-party tools that automate activity,
and that accounts using them "risk having their accounts restricted or shut down." The account at
risk would be Brian's real profile. The same risk would extend to every customer account once this
is sold as a service. Sales Navigator is also a seat subscription, which the budget rule excludes.

## What gets built (in Step 3, once Step 2 produces leads)
1. **Daily queue** (`queues/linkedin/{tenantId}/{itemId}`): the scheduler adds an item when a
   lead's sequence reaches a LinkedIn step. Daily cap per tenant (default 15 connects/day, well
   under LinkedIn's weekly invite limit).
2. **One-tap send card (phone-first)**, one card at a time:
   - The note is already personalized (merge fields filled) and checked against the 300-character limit.
   - **Copy & open**: copies the note to the clipboard and opens the person's LinkedIn profile
     (opens the LinkedIn app on a phone).
   - The person sends it in LinkedIn, comes back, and taps **Sent**. Also **Skip** and
     **Wrong person / not found**.
   - Shows the hook ("they posted about opening a 2nd location") so the sender can tweak the note.
3. **Follow-up tracking by check-off:** **Accepted** (starts the follow-up timer) and **Replied**.
   Follow-up messages show up in the queue on their day with the same copy-and-open flow.
4. **Reply help:** paste their LinkedIn reply into the lead. The AI classifies it (interested /
   not now / wrong person …, same classifier as email) and drafts an answer with the booking link
   to copy back. Interested replies notify Brian.
5. **Finding the profile URL:** from public sources found during enrichment (company website
   team page, Google results). If none is found, the card shows a LinkedIn search link (name +
   company + city) instead of a profile link. Nothing is scraped from LinkedIn.
6. **Metrics:** sent / accepted / replied / booked per day, so we can see whether LinkedIn
   earns the minutes.

Target: about 10–15 connects plus follow-ups in under 5 minutes a day, by Brian or Paul.
