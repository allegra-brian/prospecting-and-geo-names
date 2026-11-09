const test = require("node:test");
const assert = require("node:assert");
const { FULL_OUTPUT_SCHEMA, DRAFTS_SCHEMA, checkDrafts } = require("../lib/schema");
const { buildUserMessage, SYSTEM_PROMPT } = require("../lib/prompts");

function walk(schema, fn) {
  fn(schema);
  if (schema.properties) Object.values(schema.properties).forEach((s) => walk(s, fn));
  if (schema.items) walk(schema.items, fn);
}

test("every object in the schemas is closed and fully required (structured-output rules)", () => {
  for (const s of [FULL_OUTPUT_SCHEMA, DRAFTS_SCHEMA]) {
    walk(s, (node) => {
      if (node.type === "object") {
        assert.strictEqual(node.additionalProperties, false);
        assert.deepStrictEqual([...node.required].sort(), Object.keys(node.properties).sort());
      }
    });
  }
});

test("prompt includes interview answers and approved profile in drafts mode", () => {
  const program = {
    name: "GeoConnect",
    interview: { program: { name: "GeoConnect", description: "Geofencing ads" }, buyers: { industries: ["Dentists"] }, objections: [] },
    targetProfile: { summary: "Dentists near Palatine" },
  };
  const all = buildUserMessage(program, "all");
  assert.match(all, /Geofencing ads/);
  assert.match(all, /- Dentists/);
  assert.doesNotMatch(all, /APPROVED TARGET PROFILE/);
  const drafts = buildUserMessage(program, "drafts");
  assert.match(drafts, /APPROVED TARGET PROFILE/);
  assert.match(drafts, /Dentists near Palatine/);
  assert.match(SYSTEM_PROMPT, /never surveillance-flavored/);
});

test("checkDrafts flags wrong email count and long LinkedIn note", () => {
  const w = checkDrafts({ emailSequence: [{ subject: "a", body: "b" }], linkedin: { connectNote: "x".repeat(301) } });
  assert.ok(w.some((m) => /Expected 4 emails/.test(m)));
  assert.ok(w.some((m) => /LinkedIn note/.test(m)));
  const ok = checkDrafts({ emailSequence: [1, 2, 3, 4].map((n) => ({ step: n, subject: "s", body: "b" })), linkedin: { connectNote: "hi" } });
  assert.deepStrictEqual(ok, []);
});
