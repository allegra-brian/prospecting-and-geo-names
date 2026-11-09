// Calls Claude to turn a program interview into a Target Profile + drafts.
const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT, buildUserMessage } = require("./prompts");
const { FULL_OUTPUT_SCHEMA, DRAFTS_SCHEMA, checkDrafts } = require("./schema");

const MODEL = "claude-opus-5-5";
// Published per-million-token prices for MODEL, used only for the cost log.
const PRICE_IN = 4.0;
const PRICE_OUT = 20.0;

class GenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // "refused" | "truncated" | "bad_output"
  }
}

/**
 * @param {object} program  Firestore program doc data
 * @param {"all"|"drafts"} mode  "all" = profile + drafts; "drafts" = keep profile, rewrite copy
 * @param {string} apiKey
 */
async function generateProgramDrafts(program, mode, apiKey) {
  const client = new Anthropic({ apiKey });
  const schema = mode === "drafts" ? DRAFTS_SCHEMA : FULL_OUTPUT_SCHEMA;

  // Streaming avoids HTTP timeouts on long outputs; finalMessage() collects it.
  // Server-side fallbacks re-run the request on another model if a safety
  // classifier declines it, instead of failing the generation.
  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(program, mode) }],
    })
    .finalMessage();

  if (message.stop_reason === "refusal") {
    throw new GenerationError("refused", "The AI declined to write these drafts. Try rewording the interview answers.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new GenerationError("truncated", "The AI response was cut off. Try again.");
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    throw new GenerationError("bad_output", "The AI returned something that wasn't valid JSON. Try again.");
  }

  const usage = message.usage || {};
  const inTok = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
  const outTok = usage.output_tokens || 0;
  const costUsd = Math.round(((inTok * PRICE_IN + outTok * PRICE_OUT) / 1e6) * 10000) / 10000;

  return {
    targetProfile: mode === "drafts" ? null : out.targetProfile,
    drafts: {
      emailSequence: [...(out.emailSequence || [])].sort((a, b) => a.step - b.step),
      linkedin: out.linkedin,
    },
    warnings: checkDrafts(out),
    meta: { model: message.model || MODEL, inputTokens: inTok, outputTokens: outTok, costUsd },
  };
}

module.exports = { generateProgramDrafts, GenerationError, MODEL };
