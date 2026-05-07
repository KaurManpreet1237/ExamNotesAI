
// Stable model — configurable via GEMINI_MODEL env var so you can
// switch to a preview without changing code.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Stay under Render's 60 s request timeout
const FETCH_TIMEOUT_MS = 55000;
const MAX_RETRIES = 3;

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

// Strips markdown code fences and extracts the first valid JSON object
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

export const generateGeminiResponse = async (prompt) => {
  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Gemini] Attempt ${attempt}/${MAX_RETRIES} — model: ${GEMINI_MODEL}`
      );

      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const isRetryable = [429, 500, 503].includes(response.status);

        console.error(
          `[Gemini] HTTP ${response.status} on attempt ${attempt}: ${errText.slice(0, 300)}`
        );

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1500; // 3 s, 6 s
          console.log(`[Gemini] Retrying in ${delay}ms…`);
          await sleep(delay);
          lastError = new Error(
            `Gemini API returned ${response.status}: ${errText.slice(0, 200)}`
          );
          continue;
        }

        throw new Error(
          `Gemini API returned ${response.status}: ${errText.slice(0, 300)}`
        );
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const reason =
          data?.candidates?.[0]?.finishReason ||
          data?.promptFeedback?.blockReason ||
          "unknown";
        console.error(
          `[Gemini] Empty content — finishReason: ${reason}`,
          JSON.stringify(data).slice(0, 400)
        );
        throw new Error(`Gemini returned empty content (reason: ${reason})`);
      }

      const parsed = safeParseJson(text);
      console.log(`[Gemini] Success on attempt ${attempt}`);
      return parsed;
    } catch (err) {
      lastError = err;

      // Timeout
      if (err.name === "AbortError") {
        console.error(
          `[Gemini] Request timed out on attempt ${attempt} after ${FETCH_TIMEOUT_MS}ms`
        );
        if (attempt < MAX_RETRIES) {
          await sleep(Math.pow(2, attempt) * 1500);
          continue;
        }
        throw new Error(
          `Gemini request timed out after ${FETCH_TIMEOUT_MS / 1000}s`
        );
      }

      // JSON parse error — no point retrying, bad data
      if (err instanceof SyntaxError || err.message.includes("parse")) {
        console.error("[Gemini] Parse error:", err.message);
        throw err;
      }

      // Other retryable errors
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1500;
        console.warn(
          `[Gemini] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms…`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error("Gemini API failed after all retries");
};
