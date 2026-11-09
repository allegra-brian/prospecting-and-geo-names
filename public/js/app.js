// Allegra Prospector — single-page app (Step 1: program interview + target profile + drafts)
import { esc, fieldHTML, bindFields, getPath } from "./fields.js";
import { INTERVIEW_STEPS, PROFILE_SECTIONS, ROW_TEMPLATES, SAMPLE_MERGE } from "./specs.js";
import { GEOCONNECT_INTERVIEW } from "./geoconnect-defaults.js";
import { buildTemplateProfile, buildTemplateDrafts } from "./template-drafts.js";

const $main = document.getElementById("main");
const $nav = document.getElementById("nav");
const LINKEDIN_MAX = 300;

let fb;
try {
  fb = await import("./firebase.js");
} catch (err) {
  console.error(err);
  $main.innerHTML = `<div class="card auth-wrap">
    <p class="eyebrow">Setup needed</p>
    <h1>Almost there</h1>
    <p>This page can't find its Firebase settings. Copy <code>public/config.example.js</code> to <code>public/config.js</code>, paste in your Firebase web-app values, and deploy again.</p>
  </div>`;
  throw err;
}
const { auth, db, authMod, fsMod, callable } = fb;
const { doc, getDoc, getDocs, addDoc, updateDoc, collection, query, where, orderBy, serverTimestamp } = fsMod;

const session = { user: null, role: null, tenantId: null, tenant: null };
let dirty = false;
let currentHash = location.hash;

// ---------- small helpers ----------
const html = (s) => { $main.innerHTML = s; window.scrollTo(0, 0); };
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const clone = (x) => (x == null ? x : structuredClone(x));
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");
function toast(msg, ms = 3200) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function setDirty(v) {
  dirty = v;
  document.querySelectorAll("[data-dirty-label]").forEach((el) => (el.textContent = v ? "Unsaved changes" : ""));
}
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
window.addEventListener("hashchange", () => {
  if (dirty && !confirm("You have unsaved changes. Leave without saving?")) {
    history.replaceState(null, "", currentHash);
    return;
  }
  setDirty(false);
  route();
});

function renderNav() {
  if (!session.user) { $nav.innerHTML = ""; return; }
  $nav.innerHTML = `
    ${session.role ? `<a href="#/">Programs</a>` : ""}
    <span class="who">${esc(session.user.email)}</span>
    <button class="linklike" id="signout" type="button">Sign out</button>`;
  document.getElementById("signout").onclick = () => authMod.signOut(auth);
}

function friendlyAuthError(err) {
  const c = err?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "That email and password don't match.";
  if (c.includes("email-already-in-use")) return "There's already an account with that email. Try signing in.";
  if (c.includes("weak-password")) return "Use a password with at least 8 characters.";
  if (c.includes("invalid-email")) return "That doesn't look like an email address.";
  if (c.includes("too-many-requests")) return "Too many tries. Wait a minute and try again.";
  return err?.message || "Something went wrong.";
}

// ---------- auth screens ----------
function renderAuth(mode = "signin", msg = "") {
  const signup = mode === "signup";
  html(`<div class="auth-wrap">
    <div class="card">
      <p class="script tagline">We're all in</p>
      <h1>${signup ? "Create your account" : "Sign in"}</h1>
      <p class="muted">Allegra Prospector — find, qualify and book calls with local businesses.</p>
      ${msg ? `<div class="notice ${msg.startsWith("!") ? "error" : "ok"}">${esc(msg.replace(/^!/, ""))}</div>` : ""}
      <form id="authform" novalidate>
        <label class="field"><span class="label">Email</span><input type="email" id="email" autocomplete="email" required></label>
        <label class="field"><span class="label">Password</span><input type="password" id="password" autocomplete="${signup ? "new-password" : "current-password"}" required minlength="8"></label>
        <div class="row">
          <button class="btn arrow" type="submit">${signup ? "Create account" : "Sign in"}</button>
          <span class="spacer"></span>
          ${signup ? "" : `<button class="btn ghost small" type="button" id="forgot">Forgot password?</button>`}
        </div>
      </form>
      <p class="small" style="margin-top:16px">${signup
        ? `Already have an account? <a href="#" id="switch">Sign in</a>`
        : `New here? <a href="#" id="switch">Create an account</a>`}</p>
    </div>
  </div>`);
  document.getElementById("switch").onclick = (e) => { e.preventDefault(); renderAuth(signup ? "signin" : "signup"); };
  const forgot = document.getElementById("forgot");
  if (forgot) forgot.onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return renderAuth("signin", "!Type your email first, then click Forgot password.");
    try { await authMod.sendPasswordResetEmail(auth, email); renderAuth("signin", "Password reset email sent."); }
    catch (err) { renderAuth("signin", "!" + friendlyAuthError(err)); }
  };
  document.getElementById("authform").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = e.submitter; btn.disabled = true;
    try {
      if (signup) {
        if (password.length < 8) throw { code: "weak-password" };
        const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
        await authMod.sendEmailVerification(cred.user);
      } else {
        await authMod.signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      btn.disabled = false;
      renderAuth(mode, "!" + friendlyAuthError(err));
    }
  };
}

function renderVerify() {
  html(`<div class="auth-wrap"><div class="card">
    <p class="eyebrow">One more step</p>
    <h1>Check your inbox</h1>
    <p>We sent a verification link to <strong>${esc(session.user.email)}</strong>. Click it, then come back and press the button below.</p>
    <div class="row">
      <button class="btn" id="verified">I've verified my email</button>
      <button class="btn ghost" id="resend">Resend email</button>
    </div>
  </div></div>`);
  document.getElementById("verified").onclick = async () => { await session.user.reload(); await bootstrap(session.user); };
  document.getElementById("resend").onclick = async () => {
    try { await authMod.sendEmailVerification(session.user); toast("Verification email sent."); }
    catch (err) { toast(friendlyAuthError(err)); }
  };
}

function renderPending() {
  html(`<div class="auth-wrap"><div class="card">
    <p class="eyebrow">Account created</p>
    <h1>Waiting for access</h1>
    <p>Your account (<strong>${esc(session.user.email)}</strong>) is set up, but an administrator still needs to add you to a team. You'll get access as soon as they do.</p>
    <button class="btn secondary" id="recheck">Check again</button>
  </div></div>`);
  document.getElementById("recheck").onclick = () => bootstrap(session.user);
}

async function bootstrap(user) {
  html(`<div class="card"><span class="spinner"></span> Loading…</div>`);
  try {
    const res = await callable("bootstrapUser")();
    const r = res.data;
    if (r.status === "verify_email") return renderVerify();
    if (r.status === "pending") return renderPending();
    if (r.refreshToken) await user.getIdToken(true);
    session.role = r.role;
    session.tenantId = r.tenantId;
    const t = await getDoc(doc(db, "tenants", r.tenantId));
    session.tenant = t.exists() ? t.data() : null;
    renderNav();
    route();
  } catch (err) {
    console.error(err);
    html(`<div class="card"><div class="notice error">Couldn't load your account: ${esc(err.message)}</div>
      <button class="btn" onclick="location.reload()">Try again</button></div>`);
  }
}

authMod.onAuthStateChanged(auth, async (user) => {
  session.user = user;
  session.role = session.tenantId = session.tenant = null;
  renderNav();
  if (!user) return renderAuth();
  await bootstrap(user);
});

// ---------- router ----------
function route() {
  currentHash = location.hash;
  if (!session.user || !session.role) return;
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "program" && parts[1]) {
    if (parts[2] === "interview") return renderInterview(parts[1], Number(parts[3] || 1));
    return renderProgram(parts[1], parts[2] || "profile");
  }
  return renderPrograms();
}

// ---------- programs list ----------
async function renderPrograms() {
  html(`<div class="card"><span class="spinner"></span> Loading programs…</div>`);
  const q = query(collection(db, "programs"), where("tenantId", "==", session.tenantId), orderBy("updatedAt", "desc"));
  let docs = [];
  try { docs = (await getDocs(q)).docs; }
  catch (err) { console.error(err); return html(`<div class="notice error">Couldn't load programs: ${esc(err.message)}</div>`); }

  const hasGeo = docs.some((d) => d.data().name === "GeoConnect");
  const cards = docs.map((d) => {
    const p = d.data();
    const status = p.status || "new";
    const label = { new: "Interview in progress", draft: "Drafts ready for review", approved: "Approved" }[status] || status;
    const next = p.targetProfile ? `#/program/${d.id}/profile` : `#/program/${d.id}/interview/${(p.interviewStep || 0) + 1}`;
    return `<div class="card program-card">
      <div>
        <h2>${esc(p.name || "Untitled program")}</h2>
        <div class="meta"><span class="pill ${esc(status)}">${esc(label)}</span> · updated ${esc(fmtDate(p.updatedAt))}</div>
      </div>
      <span class="spacer"></span>
      <a class="btn ${p.targetProfile ? "" : "arrow"}" href="${next}">${p.targetProfile ? "Open" : "Continue interview"}</a>
    </div>`;
  }).join("");

  html(`<div class="page-head">
      <div><p class="eyebrow">${esc(session.tenant?.name || session.tenantId)}</p><h1>Programs</h1></div>
      <div class="row">
        ${hasGeo ? "" : `<button class="btn arrow" id="new-geo">Start GeoConnect interview</button>`}
        <button class="btn secondary" id="new-blank">New program</button>
      </div>
    </div>
    ${cards || `<div class="card empty">
      <h2>Define what you're selling</h2>
      <p class="muted">A short interview turns your program into a target profile, a 4-step email sequence and a LinkedIn note.
      GeoConnect is pre-filled from your brief — you just confirm or edit.</p>
    </div>`}`);
  const g = document.getElementById("new-geo");
  if (g) g.onclick = () => createProgram("GeoConnect", GEOCONNECT_INTERVIEW);
  document.getElementById("new-blank").onclick = () => {
    const name = prompt("Program name?");
    if (name && name.trim()) createProgram(name.trim(), { program: { name: name.trim() }, objections: [] });
  };
}

async function createProgram(name, interview) {
  const ref = await addDoc(collection(db, "programs"), {
    tenantId: session.tenantId,
    name,
    interview: clone(interview),
    interviewStep: 0,
    status: "new",
    targetProfile: null,
    drafts: null,
    generation: null,
    createdBy: session.user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  go(`#/program/${ref.id}/interview/1`);
}

async function loadProgram(id) {
  const snap = await getDoc(doc(db, "programs", id));
  if (!snap.exists()) throw new Error("Program not found.");
  return snap.data();
}

// ---------- interview wizard ----------
async function renderInterview(id, step) {
  let program;
  try { program = await loadProgram(id); }
  catch (err) { return html(`<div class="notice error">${esc(err.message)}</div><a class="btn" href="#/">Back to programs</a>`); }

  const total = INTERVIEW_STEPS.length;
  step = Math.min(Math.max(step, 1), total + 1);
  const state = { ...clone(program.interview || {}) };
  const isReview = step === total + 1;
  const spec = INTERVIEW_STEPS[step - 1];

  const stepper = `<ol class="stepper" aria-label="Interview steps">
    ${[...INTERVIEW_STEPS, { title: "Review" }].map((s, i) => `<li class="${i + 1 < step ? "done" : i + 1 === step ? "current" : ""}">
      <button type="button" data-goto="${i + 1}" ${i + 1 === step ? 'aria-current="step"' : ""}><span class="bar"></span><span class="lbl">${esc(s.title)}</span></button>
    </li>`).join("")}
  </ol>`;

  const body = isReview ? reviewHTML(program, state) : `
    <p class="eyebrow">Step ${step} of ${total}</p>
    <h1>${esc(spec.title)}</h1>
    <p class="muted">${esc(spec.intro)}</p>
    ${step === 1 && program.name === "GeoConnect" ? `<div class="notice">Pre-filled from the project brief. Answers starting with “Suggested:” are starting points — edit or replace them.</div>` : ""}
    <form id="stepform" novalidate>${spec.fields.map((f) => fieldHTML(f, state)).join("")}</form>`;

  html(`<div class="page-head"><div><p class="eyebrow">Program interview</p><h1 style="font-size:22px">${esc(program.name)}</h1></div>
      <a class="btn ghost" href="#/">All programs</a></div>
    ${stepper}
    <div class="card" id="stepcard">${body}
      <div class="wizard-foot">
        ${step > 1 ? `<button class="btn secondary" type="button" data-goto="${step - 1}">Back</button>` : ""}
        ${isReview ? "" : `<button class="btn arrow" type="button" data-goto="${step + 1}">${step === total ? "Review answers" : "Save & next"}</button>`}
        <span class="spacer"></span>
        <span class="saved-at" data-dirty-label></span>
      </div>
    </div>`);

  const save = async () => {
    if (!dirty && (program.interviewStep || 0) >= Math.min(step, total)) return;
    await updateDoc(doc(db, "programs", id), {
      interview: state,
      name: state.program?.name || program.name,
      interviewStep: Math.max(program.interviewStep || 0, Math.min(step, total)),
      updatedAt: serverTimestamp(),
    });
    setDirty(false);
  };

  if (!isReview) {
    const form = document.getElementById("stepform");
    const rerender = () => { form.innerHTML = spec.fields.map((f) => fieldHTML(f, state)).join(""); };
    bindFields(form, state, { onChange: () => setDirty(true), rerender, rowTemplates: ROW_TEMPLATES });
  } else {
    bindReview(id, program);
  }
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.addEventListener("click", async () => {
      b.disabled = true;
      try { await save(); go(`#/program/${id}/interview/${b.dataset.goto}`); }
      catch (err) { b.disabled = false; toast("Couldn't save: " + err.message); }
    });
  });
}

function listOrDash(arr) {
  const a = (arr || []).filter(Boolean);
  return a.length ? `<ul style="margin:0;padding-left:18px">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">—</span>`;
}

function answersHTML(i) {
  i = i || {};
  return `<dl class="kv">
    <dt>Program</dt><dd><strong>${esc(i.program?.name)}</strong><br>${esc(i.program?.description)}</dd>
    <dt>How it works</dt><dd>${esc(i.program?.howItWorks) || "—"}</dd>
    <dt>Industries</dt><dd>${listOrDash(i.buyers?.industries)}</dd>
    <dt>Titles</dt><dd>${listOrDash(i.buyers?.titles)}</dd>
    <dt>Company size</dt><dd>${esc(i.buyers?.companySize) || "—"}</dd>
    <dt>Outcomes</dt><dd>${listOrDash(i.whyBuy?.outcomes)}</dd>
    <dt>Value props</dt><dd>${listOrDash(i.whyBuy?.valueProps)}</dd>
    <dt>Signals</dt><dd>${listOrDash(i.qualification?.signals)}</dd>
    <dt>Disqualifiers</dt><dd>${listOrDash(i.qualification?.disqualifiers)}</dd>
    <dt>Routing</dt><dd>${listOrDash(i.qualification?.routing)}</dd>
    <dt>Objections</dt><dd>${listOrDash((i.objections || []).map((o) => `${o.objection} → ${o.response}`))}</dd>
    <dt>Proof</dt><dd>${listOrDash(i.proof?.points)}</dd>
    <dt>Geography</dt><dd>${esc(i.geography?.center)}${i.geography?.radiusMiles ? `, ${esc(i.geography.radiusMiles)} miles` : ""}${i.geography?.zips ? `<br>ZIPs: ${esc(i.geography.zips)}` : ""}</dd>
    <dt>Call offer</dt><dd>${esc(i.offer?.meetingMinutes)} min — ${esc(i.offer?.whatTheyGet)}<br><span class="muted">CTA:</span> ${esc(i.offer?.cta)}</dd>
    <dt>Sender</dt><dd>${esc(i.voice?.senderName)}</dd>
  </dl>`;
}

function reviewHTML(program, state) {
  const noProof = !(state.proof?.points || []).length;
  return `<p class="eyebrow">Last step</p>
    <h1>Review and generate</h1>
    <p class="muted">Check the answers below. Then generate the Target Profile, a 4-step email sequence and a LinkedIn connect note. You can edit everything afterwards.</p>
    ${noProof ? `<div class="notice warn"><strong>No proof points yet.</strong> The drafts will avoid numbers and results until you add real ones (Step 6).</div>` : ""}
    ${program.targetProfile ? `<div class="notice warn">This program already has a profile and drafts. Generating again will <strong>replace</strong> them.</div>` : ""}
    ${answersHTML(state)}
    <div id="gen-area" style="margin-top:24px">
      <div class="row">
        <button class="btn arrow" id="gen-ai">Generate with AI</button>
        <button class="btn ghost" id="gen-template">Quick template draft (no AI)</button>
      </div>
    </div>`;
}

function bindReview(id, program) {
  const area = document.getElementById("gen-area");
  document.getElementById("gen-ai").onclick = () => {
    if (program.targetProfile && !confirm("Replace the current profile and drafts?")) return;
    runAI(id, "all", area);
  };
  document.getElementById("gen-template").onclick = () => {
    if (program.targetProfile && !confirm("Replace the current profile and drafts?")) return;
    runTemplate(id, "all");
  };
}

async function runAI(id, mode, area) {
  const before = area.innerHTML;
  area.innerHTML = `<div class="notice"><span class="spinner"></span>&nbsp; Writing your ${mode === "all" ? "target profile and drafts" : "new drafts"}… this usually takes 1–2 minutes. Keep this page open.</div>`;
  try {
    const res = await callable("generateProgramDrafts", { timeout: 560000 })({ programId: id, mode });
    const w = res.data?.warnings || [];
    toast(w.length ? `Done — ${w.length} thing(s) to check.` : "Done! Review the drafts below.");
    go(`#/program/${id}/${mode === "all" ? "profile" : "emails"}`);
  } catch (err) {
    console.error(err);
    const noKey = err.code === "functions/failed-precondition";
    area.innerHTML = `<div class="notice ${noKey ? "warn" : "error"}">
        <strong>${noKey ? "AI isn't connected yet." : "The AI draft didn't finish."}</strong> ${esc(err.message)}
      </div>
      <div class="row">
        <button class="btn" id="retry-ai">Try AI again</button>
        <button class="btn secondary" id="use-template">Use quick template draft instead</button>
      </div>`;
    document.getElementById("retry-ai").onclick = () => { area.innerHTML = before; runAI(id, mode, area); };
    document.getElementById("use-template").onclick = () => runTemplate(id, mode);
  }
}

async function runTemplate(id, mode) {
  const program = await loadProgram(id);
  const profile = mode === "drafts" && program.targetProfile ? program.targetProfile : buildTemplateProfile(program.interview);
  const drafts = buildTemplateDrafts(program.interview, profile);
  await updateDoc(doc(db, "programs", id), {
    targetProfile: profile,
    drafts: { ...drafts, approvedAt: null, approvedBy: null },
    generation: { by: "template", mode, model: null, warnings: [], at: serverTimestamp(), uid: session.user.uid },
    status: "draft",
    updatedAt: serverTimestamp(),
  });
  toast("Template drafts created. Edit them to taste.");
  go(`#/program/${id}/${mode === "all" ? "profile" : "emails"}`);
}

// ---------- program detail ----------
const TABS = [["profile", "Target Profile"], ["emails", "Email sequence"], ["linkedin", "LinkedIn"], ["answers", "Interview answers"]];

function mergePreview(text) {
  return esc(text).replace(/\{\{(\w+)\}\}/g, (_, k) => `<span class="merge" title="{{${k}}}">${esc(SAMPLE_MERGE[k] ?? k)}</span>`);
}

function canSpamFooter() {
  const addr = session.tenant?.physicalAddress;
  return `${esc(session.tenant?.name || "")} · ${addr ? esc(addr) : `<em>[physical mailing address — required before sending]</em>`}<br>
    Not interested? <u>Unsubscribe</u> and we won't email you again.`;
}

async function renderProgram(id, tab) {
  let program;
  try { program = await loadProgram(id); }
  catch (err) { return html(`<div class="notice error">${esc(err.message)}</div><a class="btn" href="#/">Back to programs</a>`); }
  if (!TABS.some(([k]) => k === tab)) tab = "profile";

  const status = program.status || "new";
  const gen = program.generation;
  const genLine = gen ? (gen.by === "claude" ? `Drafted by Claude AI · ${fmtDate(gen.at)}` : `Quick template draft · ${fmtDate(gen.at)}`) : "";
  const approved = !!program.drafts?.approvedAt;

  html(`<div class="page-head">
      <div>
        <p class="eyebrow">Program</p>
        <h1>${esc(program.name)}</h1>
        <div class="small muted"><span class="pill ${approved ? "approved" : status}">${approved ? "Templates approved" : status === "draft" ? "Drafts ready for review" : "Interview in progress"}</span>
        ${genLine ? ` · ${esc(genLine)}` : ""}</div>
      </div>
      <div class="row">
        <a class="btn secondary" href="#/program/${id}/interview/1">Edit interview</a>
        <a class="btn ghost" href="#/">All programs</a>
      </div>
    </div>
    ${(gen?.warnings || []).length ? `<div class="notice warn"><strong>Worth a look:</strong> ${gen.warnings.map(esc).join(" ")}</div>` : ""}
    <div class="tabs" role="tablist">
      ${TABS.map(([k, l]) => `<a class="tab" role="tab" aria-selected="${k === tab}" href="#/program/${id}/${k}">${esc(l)}</a>`).join("")}
    </div>
    <div id="tabbody"></div>`);

  const body = document.getElementById("tabbody");
  if (tab === "answers") {
    body.innerHTML = `<div class="card">${answersHTML(program.interview)}</div>`;
    return;
  }
  if (!program.targetProfile) {
    body.innerHTML = `<div class="card empty"><h2>No target profile yet</h2>
      <p class="muted">Finish the interview, then generate the profile and drafts.</p>
      <a class="btn arrow" href="#/program/${id}/interview/${INTERVIEW_STEPS.length + 1}">Go to review & generate</a></div>`;
    return;
  }
  if (tab === "profile") return profileTab(id, program, body);
  if (tab === "emails") return emailsTab(id, program, body);
  if (tab === "linkedin") return linkedinTab(id, program, body);
}

function stickyBar(extra = "") {
  return `<div class="sticky-actions">
    <button class="btn" data-save disabled>Save changes</button>
    ${extra}
    <span class="spacer"></span><span class="saved-at" data-dirty-label></span>
  </div>`;
}

function wireSave(root, onSave) {
  const btn = root.querySelector("[data-save]");
  const mark = () => { setDirty(true); btn.disabled = false; };
  btn.onclick = async () => {
    btn.disabled = true;
    try { await onSave(); setDirty(false); toast("Saved."); }
    catch (err) { btn.disabled = false; toast("Couldn't save: " + err.message); }
  };
  return mark;
}

function profileTab(id, program, body) {
  const state = { targetProfile: clone(program.targetProfile) };
  const render = () => {
    body.innerHTML = `<div id="pf">${PROFILE_SECTIONS.map((s) => `<div class="card"><h2>${esc(s.title)}</h2>
        ${s.fields.map((f) => fieldHTML(f, state)).join("")}</div>`).join("")}</div>
      ${stickyBar(`<button class="btn secondary" id="redraft">Rewrite drafts from this profile</button>`)}
      <div id="redraft-area"></div>`;
  };
  render();
  const pf = () => body.querySelector("#pf");
  const mark = wireSave(body, async () => {
    await updateDoc(doc(db, "programs", id), { targetProfile: state.targetProfile, updatedAt: serverTimestamp() });
  });
  bindFields(body, state, {
    onChange: mark,
    rerender: () => { pf().innerHTML = PROFILE_SECTIONS.map((s) => `<div class="card"><h2>${esc(s.title)}</h2>${s.fields.map((f) => fieldHTML(f, state)).join("")}</div>`).join(""); },
    rowTemplates: ROW_TEMPLATES,
  });
  body.querySelector("#redraft").onclick = async () => {
    if (dirty) { toast("Save your profile changes first."); return; }
    if (!confirm("Write new email and LinkedIn drafts from this profile? Your current drafts will be replaced.")) return;
    runAI(id, "drafts", body.querySelector("#redraft-area"));
  };
}

async function approve(id) {
  if (dirty) { toast("Save your changes first."); return; }
  if (!confirm("Approve these templates? Once sequences are running (Step 3), approved templates send without per-email approval.")) return;
  await updateDoc(doc(db, "programs", id), {
    "drafts.approvedAt": serverTimestamp(),
    "drafts.approvedBy": session.user.uid,
    status: "approved",
    updatedAt: serverTimestamp(),
  });
  toast("Templates approved.");
  route();
}

async function saveDrafts(id, drafts, wasApproved) {
  const upd = { "drafts.emailSequence": drafts.emailSequence, "drafts.linkedin": drafts.linkedin, updatedAt: serverTimestamp() };
  if (wasApproved) Object.assign(upd, { "drafts.approvedAt": null, "drafts.approvedBy": null, status: "draft" });
  await updateDoc(doc(db, "programs", id), upd);
  if (wasApproved) { toast("Saved. Edited templates need approval again."); setTimeout(route, 400); }
}

function emailsTab(id, program, body) {
  const state = { drafts: clone(program.drafts) || { emailSequence: [], linkedin: {} } };
  const approved = !!program.drafts?.approvedAt;
  const seq = state.drafts.emailSequence || [];
  body.innerHTML = `
    ${approved ? `<div class="notice ok">Approved ${esc(fmtDate(program.drafts.approvedAt))}. Editing will require approval again.</div>` : ""}
    <p class="muted small">Merge fields like <span class="merge">{{firstName}}</span> fill in per lead. The CAN-SPAM footer (address + unsubscribe) is added automatically when sending.</p>
    <div id="em">${seq.map((e, i) => `<div class="card">
      <div class="email-step-head"><span class="step-num">${i + 1}</span>
        <h3 style="margin:0">${esc(e.purpose || `Email ${i + 1}`)}</h3><span class="spacer"></span>
        <button class="btn ghost small" type="button" data-preview="${i}">Preview</button></div>
      <div class="grid two">
        ${fieldHTML({ path: `drafts.emailSequence.${i}.subject`, label: "Subject" }, state)}
        ${fieldHTML({ path: `drafts.emailSequence.${i}.dayOffset`, label: "Send on day", kind: "number", min: 0, help: "Days after email 1." }, state)}
      </div>
      ${fieldHTML({ path: `drafts.emailSequence.${i}.body`, label: "Body", kind: "textarea", tall: true }, state)}
      <div class="preview" data-preview-box="${i}" hidden></div>
    </div>`).join("")}</div>
    ${stickyBar(`<button class="btn secondary arrow" id="approve" ${approved ? "disabled" : ""}>${approved ? "Approved" : "Approve templates"}</button>`)}`;
  const mark = wireSave(body, () => saveDrafts(id, state.drafts, approved));
  bindFields(body, state, { onChange: mark });
  body.querySelectorAll("[data-preview]").forEach((b) => (b.onclick = () => {
    const i = Number(b.dataset.preview);
    const box = body.querySelector(`[data-preview-box="${i}"]`);
    const e = state.drafts.emailSequence[i];
    box.innerHTML = `<div class="subj">${mergePreview(e.subject)}</div>${mergePreview(e.body)}<div class="footer-legal">${canSpamFooter()}</div>`;
    box.hidden = !box.hidden;
    b.textContent = box.hidden ? "Preview" : "Hide preview";
  }));
  body.querySelector("#approve").onclick = () => approve(id);
}

function linkedinTab(id, program, body) {
  const state = { drafts: clone(program.drafts) || { emailSequence: [], linkedin: {} } };
  state.drafts.linkedin = state.drafts.linkedin || { connectNote: "", hookIdeas: [], followUps: [] };
  const approved = !!program.drafts?.approvedAt;
  const render = () => `
    <div class="card">
      <h2>Connect note</h2>
      <p class="muted small">Sent by hand from your own LinkedIn profile — never automated. LinkedIn allows up to ${LINKEDIN_MAX} characters.</p>
      ${fieldHTML({ path: "drafts.linkedin.connectNote", label: "Note", kind: "textarea", rows: 4, maxChars: LINKEDIN_MAX }, state)}
    </div>
    <div class="card">
      <h2>Conversation hooks</h2>
      ${fieldHTML({ path: "drafts.linkedin.hookIdeas", label: "What to look for on their profile", kind: "lines" }, state)}
    </div>
    <div class="card">
      <h2>Follow-ups after they accept</h2>
      ${fieldHTML({ path: "drafts.linkedin.followUps", label: "Messages", kind: "rows", addLabel: "Add follow-up",
        fields: [{ path: "dayOffset", label: "Days after accepting", kind: "number", min: 0 }, { path: "message", label: "Message", kind: "textarea", rows: 3 }] }, state)}
    </div>`;
  body.innerHTML = `<div id="li">${render()}</div>
    ${stickyBar(`<button class="btn secondary arrow" id="approve" ${approved ? "disabled" : ""}>${approved ? "Approved" : "Approve templates"}</button>`)}`;
  const li = body.querySelector("#li");
  const n = state.drafts.linkedin.connectNote?.length || 0;
  li.querySelector(".counter")?.classList.toggle("over", n > LINKEDIN_MAX);
  const mark = wireSave(body, () => saveDrafts(id, state.drafts, approved));
  bindFields(li, state, { onChange: mark, rerender: () => { li.innerHTML = render(); }, rowTemplates: ROW_TEMPLATES });
  body.querySelector("#approve").onclick = () => approve(id);
}

// expose for debugging in the console
window.__prospector = { session, getPath };
