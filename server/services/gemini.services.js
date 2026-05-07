// Model fallback chain — tried in order.
// When one model's free-tier daily quota (RPD) is exhausted,
// the service automatically falls over to the next model.
// On free tier each model has 20 RPD, so this gives up to 60 RPD total.
//
// Override the primary model via GEMINI_MODEL env var.
// Override the full chain via GEMINI_MODELS (comma-separated), e.g.:
//   GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash
const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash",          // Gemini 2.5 Flash — fresh quota, shown in your AI Studio
  "gemini-2.0-flash",          // Gemini 2.0 Flash — stable fallback
  "gemini-1.5-flash",          // Gemini 1.5 Flash — final safety net
];

function getModelChain() {
  if (process.env.GEMINI_MODELS) {
    return process.env.GEMINI_MODELS.split(",").map((m) => m.trim()).filter(Boolean);
  }
  if (process.env.GEMINI_MODEL) {
    // Single override: put it first, keep the rest as fallbacks
    const primary = process.env.GEMINI_MODEL.trim();
    const rest = DEFAULT_MODEL_CHAIN.filter((m) => m !== primary);
    return [primary, ...rest];
  }
  return DEFAULT_MODEL_CHAIN;
}

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// 55 s — stays under Render's 60 s request timeout
const FETCH_TIMEOUT_MS = 55000;

// Retries per model for transient errors (503, 500, timeout)
// 429 quota errors are NOT retried — we switch model immediately.
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

// Try a single model with retry on transient errors only (not quota errors)
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

        // 429 = quota exceeded — do NOT retry this model, signal caller to try next
        if (response.status === 429) {
          console.warn(`[Gemini] model=${model} QUOTA EXCEEDED (429) — switching to next model`);
          const err = new Error(`QUOTA_EXCEEDED:${model}`);
          err.isQuotaError = true;
          throw err;
        }

        // 503 / 500 — transient, may retry
        const isTransient = [500, 503].includes(response.status);
        console.error(`[Gemini] model=${model} HTTP ${response.status} attempt ${attempt}: ${errText.slice(0, 200)}`);

        if (isTransient && attempt < TRANSIENT_RETRIES) {
          await sleep(Math.pow(2, attempt) * 1500);
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
        console.error(`[Gemini] model=${model} empty content (reason: ${reason})`);
        throw new Error(`Gemini returned empty content (reason: ${reason})`);
      }

      const parsed = safeParseJson(text);
      console.log(`[Gemini] model=${model} success on attempt ${attempt}`);
      return parsed;

    } catch (err) {
      // Quota errors bubble up immediately — don't retry
      if (err.isQuotaError) throw err;

      // Timeout
      if (err.name === "AbortError") {
        console.error(`[Gemini] model=${model} timed out after ${FETCH_TIMEOUT_MS}ms`);
        if (attempt < TRANSIENT_RETRIES) {
          await sleep(Math.pow(2, attempt) * 1500);
          continue;
        }
        throw new Error(`Gemini timeout after ${FETCH_TIMEOUT_MS / 1000}s`);
      }

      // JSON parse error — no retry
      if (err.message.includes("parse")) throw err;

      if (attempt < TRANSIENT_RETRIES) {
        await sleep(Math.pow(2, attempt) * 1500);
        continue;
      }
      throw err;
    }
  }
}

export const generateGeminiResponse = async (prompt) => {
  const chain = getModelChain();

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const quotaExhaustedModels = [];

  for (const model of chain) {
    try {
      return await tryModel(model, requestBody);
    } catch (err) {
      if (err.isQuotaError) {
        // This model's daily quota is exhausted — try the next one
        quotaExhaustedModels.push(model);
        if (quotaExhaustedModels.length < chain.length) {
          console.log(`[Gemini] Falling over to next model… (${quotaExhaustedModels.length}/${chain.length} exhausted)`);
          continue;
        }
        // All models exhausted
        console.error(`[Gemini] All models quota-exhausted: ${chain.join(", ")}`);
        throw new Error(
          `DAILY_QUOTA_EXHAUSTED: All Gemini models (${chain.join(", ")}) have hit their free-tier daily limit. ` +
          `Please wait until midnight (Pacific Time) for the quota to reset, or upgrade your Google AI plan.`
        );
      }
      // Non-quota error from last model in chain — propagate
      throw err;
    }
  }

  throw new Error("Gemini: no models available");
};
