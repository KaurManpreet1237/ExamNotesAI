import express from "express";
import dotenv from "dotenv";
import connectDb from "./utils/connectDb.js";
import authRouter from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRouter from "./routes/user.route.js";
import notesRouter from "./routes/genrate.route.js";
import pdfRouter from "./routes/pdf.route.js";
import creditRouter from "./routes/credits.route.js";
import adminRouter from "./routes/admin.routes.js";
import { stripeWebhook } from "./controllers/credits.controller.js";

dotenv.config();

const app = express();

// ─── CORS — dynamic multi-origin ─────────────────────────────────────────────
// Supports localhost dev AND any number of deployed frontend URLs via env vars.
// Never uses wildcard "*" so credentials/cookies always work.
const rawOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",           // Vite sometimes uses 5174 as fallback
  process.env.CLIENT_URL,            // e.g. https://examnotesai-client-qxbf.onrender.com
  process.env.CLIENT_URL_2,          // optional second frontend URL
].filter(Boolean);                   // remove undefined / empty

// Deduplicate — avoids duplicate-header warnings
const ALLOWED_ORIGINS = [...new Set(rawOrigins)];

app.use(
  cors({
    origin(requestOrigin, callback) {
      // requestOrigin is undefined for same-origin / curl / Postman → allow
      if (!requestOrigin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(requestOrigin)) return callback(null, true);
      // Block everything else with a clear message (visible in server logs)
      callback(new Error(`CORS: origin '${requestOrigin}' not in allowed list`));
    },
    credentials: true,                 // required for cookies / JWT
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,         // IE11 compatibility
  })
);

// ─── Stripe webhook — MUST be before express.json() (needs raw body) ─────────
app.post(
  "/api/credits/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8000;

app.get("/", (_req, res) => {
  res.json({ message: "ExamCraft Backend Running 🚀" });
});

app.use("/api/auth",   authRouter);
app.use("/api/user",   userRouter);
app.use("/api/notes",  notesRouter);
app.use("/api/pdf",    pdfRouter);
app.use("/api/credit", creditRouter);
app.use("/api/admin",  adminRouter);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  connectDb();
});