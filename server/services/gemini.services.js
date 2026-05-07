// ─────────────────────────────────────────────────────────────────────────────
// FREE-TIER QUOTA STRATEGY
// Each model has its own 20 RPD (requests per day) bucket on the free tier.
// By chaining 4 models we get up to 80 RPD total before any user sees an error.
//
// Current usage (confirmed from Google AI Studio):
//   gemini-3-flash-preview   — exhausted today (was the original model)
//   gemini-2.5-flash         — 0 / 20 RPD used  ← used first after deploy
//   gemini-2.0-flash         — 0 / 20 RPD used
//   gemini-1.5-flash         — 0 / 20 RPD used
//
// Override via env vars (no redeploy needed):
//   GEMINI_MODEL=single-model-name
//   GEMINI_MODELS=model1,model2,model3   (full custom chain)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash",        // Gemini 2.5 Flash  — fresh quota today
  "gemini-2.0-flash",        // Gemini 2.0 Flash  — separate quota pool
  "gemini-1.5-flash",        // Gemini 1.5 Flash  — very stable, separate quota
  "gemini-3-flash-preview",  // Gemini 3 Flash    — used as last resort; resets daily
];

function getModelChain() {
  if (process.env.GEMINI_MODELS) {
    return process.env.GEMINI_MODELS.split(",").map((m) => m.trim()).filter(Boolean);
  }
  if (process.env.GEMINI_MODEL) {
    const primary = process.env.GEMINI_MODEL.trim();
    const rest = DEFAULT_MODEL_CHAIN.filter((m) => m !== primary);
    return [primary, ...rest];
  }
  return DEFAULT_MODEL_CHAIN;
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// 55 s — stays safely under Render's 60 s hard request timeout
const FETCH_TIMEOUT_MS = 55000;

// Max retries per model for TRANSIENT errors (503, 500, network timeout).
// 429 quota errors are NEVER retried — we switch model immediately.
const TRANSIENT_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Strips ```json fences and extracts the first {...} JSON object
function safeParseJson(raw) {
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Gemini response");
  }

  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch (err) {
    throw new Error(`Gemini JSON parse failed: ${err.message}`);
  }
}

// Try one specific model. Returns parsed result or throws.
// Throws err.isQuotaError = true when the model's daily quota is exhausted.
async function tryModel(model, requestBody) {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  for (let attempt = 1; attempt <= TRANSIENT_RETRIES; attempt++) {
    try {
      console.log(`[Gemini] model=${model} attempt=${attempt}/${TRANSIENT_RETRIES}`);

      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");

        // ── 429 = daily quota exhausted — switch model immediately, no retry ──
        if (response.status === 429) {
          console.warn(`[Gemini] model=${model} daily quota exhausted (429) — switching model`);
          const err = new Error(`QUOTA_EXCEEDED:${model}`);
          err.isQuotaError = true;
          throw err;
        }

        // ── 503 / 500 = transient — retry same model ──
        const isTransient = [500, 503].includes(response.status);
        console.error(
          `[Gemini] model=${model} HTTP ${response.status} attempt ${attempt}: ${errText.slice(0, 200)}`
        );

        if (isTransient && attempt < TRANSIENT_RETRIES) {
          await sleep(Math.pow(2, attempt) * 1500); // 3 s, 6 s
          continue;
        }

        throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const reason =
          data?.candidates?.[0]?.finishReason ||
          data?.promptFeedback?.blockReason ||
          "unknown";
        console.error(`[Gemini] model=${model} empty response (reason: ${reason})`);
        throw new Error(`Gemini empty content (reason: ${reason})`);
      }

      const parsed = safeParseJson(text);
      console.log(`[Gemini] model=${model} success on attempt ${attempt}`);
      return parsed;

    } catch (err) {
      // Quota errors must bubble up immediately — don't retry
      if (err.isQuotaError) throw err;

      // AbortController fired — request timed out
      if (err.name === "AbortError") {
        console.error(`[Gemini] model=${model} timed out after ${FETCH_TIMEOUT_MS}ms`);
        if (attempt < TRANSIENT_RETRIES) {
          await sleep(Math.pow(2, attempt) * 1500);
          continue;
        }
        throw new Error(`Gemini request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
      }

      // JSON parse error — bad data, no retry helps
      if (err.message.includes("parse")) throw err;

      // Other transient error — retry
      if (attempt < TRANSIENT_RETRIES) {
        console.warn(`[Gemini] model=${model} attempt ${attempt} failed: ${err.message} — retrying`);
        await sleep(Math.pow(2, attempt) * 1500);
        continue;
      }

      throw err;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const generateGeminiResponse = async (prompt) => {
  const chain = getModelChain();

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const exhausted = [];

  for (const model of chain) {
    try {
      return await tryModel(model, requestBody);
    } catch (err) {
      if (err.isQuotaError) {
        exhausted.push(model);
        const remaining = chain.length - exhausted.length;
        if (remaining > 0) {
          console.log(
            `[Gemini] ${exhausted.length}/${chain.length} models exhausted — trying next`
          );
          continue;
        }
        // All models in the chain have hit their daily limit
        console.error(`[Gemini] All models quota-exhausted: ${chain.join(", ")}`);
        throw new Error(
          "DAILY_QUOTA_EXHAUSTED: All AI models have hit their free-tier daily limit. " +
          "Quota resets at midnight Pacific Time. Please try again later or contact support."
        );
      }
      // Non-quota error (timeout, parse, HTTP 500/503 after retries) — propagate as-is
      throw err;
    }
  }

  throw new Error("Gemini: no models available in chain");
};
