import Notes from "../models/notes.model.js";
import UserModel from "../models/user.model.js";
import { generateGeminiResponse } from "../services/gemini.services.js";
import { buildPrompt } from "../utils/promptBuilder.js";

export const generateNotes = async (req, res) => {
  try {
    const {
      topic,
      classLevel,
      examType,
      revisionMode = false,
      includeDiagram = false,
      includeChart = false,
    } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res
        .status(400)
        .json({ message: "Topic is required and must be a non-empty string" });
    }
    if (topic.trim().length > 500) {
      return res
        .status(400)
        .json({ message: "Topic must be under 500 characters" });
    }

    // ── User check ──────────────────────────────────────────────────────────
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.credits < 10) {
      user.isCreditAvailable = false;
      await user.save();
      return res.status(403).json({
        message: "Insufficient credits. Please purchase more credits.",
      });
    }

    // ── Build prompt ────────────────────────────────────────────────────────
    const prompt = buildPrompt({
      topic: topic.trim(),
      classLevel,
      examType,
      revisionMode,
      includeDiagram,
      includeChart,
    });

    console.log(
      `[Notes] Generating for topic: "${topic.trim()}" | user: ${req.userId}`
    );

    // ── Call AI ─────────────────────────────────────────────────────────────
    const aiResponse = await generateGeminiResponse(prompt);

    if (!aiResponse || typeof aiResponse !== "object") {
      throw new Error("AI returned an invalid response structure");
    }

    // ── Persist ─────────────────────────────────────────────────────────────
    const notes = await Notes.create({
      user: user._id,
      topic: topic.trim(),
      classLevel,
      examType,
      revisionMode,
      includeDiagram,
      includeChart,
      content: aiResponse,
    });

    user.credits -= 10;
    if (user.credits <= 0) user.isCreditAvailable = false;

    if (!Array.isArray(user.notes)) user.notes = [];
    user.notes.push(notes._id);
    await user.save();

    console.log(
      `[Notes] Success — noteId: ${notes._id} | creditsLeft: ${user.credits}`
    );

    return res.status(200).json({
      data: aiResponse,
      noteId: notes._id,
      creditsLeft: user.credits,
    });
  } catch (error) {
    console.error("[Notes] generateNotes error:", error.message);

    // Classify error so the frontend can show a meaningful message
    if (
      error.message.includes("timed out") ||
      error.message.includes("timeout")
    ) {
      return res.status(504).json({
        error: "AI_TIMEOUT",
        message:
          "The AI took too long to respond. Please try again with a shorter or simpler topic.",
      });
    }

    if (
      error.message.includes("503") ||
      error.message.includes("high demand") ||
      error.message.includes("UNAVAILABLE")
    ) {
      return res.status(503).json({
        error: "AI_UNAVAILABLE",
        message:
          "The AI service is temporarily busy. Please wait a moment and try again.",
      });
    }

    if (
      error.message.includes("parse") ||
      error.message.includes("JSON") ||
      error.message.includes("malformed")
    ) {
      return res.status(502).json({
        error: "AI_PARSE_ERROR",
        message:
          "The AI returned an unexpected response. Please try again.",
      });
    }

    if (
      error.message.includes("DAILY_QUOTA_EXHAUSTED") ||
      error.message.includes("QUOTA_EXCEEDED") ||
      error.message.includes("429") ||
      error.message.includes("quota")
    ) {
      return res.status(429).json({
        error: "AI_QUOTA_EXHAUSTED",
        message:
          "Daily AI generation limit reached across all models. Free-tier quota resets at midnight (Pacific Time). Please try again later.",
      });
    }

    return res.status(500).json({
      error: "GENERATION_FAILED",
      message: error.message || "Note generation failed. Please try again.",
    });
  }
};
