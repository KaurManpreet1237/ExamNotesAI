import mongoose from "mongoose";

const RETRY_LIMIT = 5;
const BASE_DELAY_MS = 2000;

// Production-safe Mongoose connection options.
// serverSelectionTimeoutMS prevents the app from hanging forever when
// MongoDB Atlas is slow to respond (common on Render cold starts).
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  maxPoolSize: 10,
  retryWrites: true,
};

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGODB_URL, MONGOOSE_OPTIONS);
    console.log(`[DB] Connected to MongoDB (attempt ${attempt})`);
  } catch (error) {
    console.error(
      `[DB] Connection attempt ${attempt}/${RETRY_LIMIT} failed: ${error.message}`
    );

    if (attempt >= RETRY_LIMIT) {
      console.error("[DB] Max retries reached. Shutting down.");
      process.exit(1);
    }

    const delay = BASE_DELAY_MS * attempt;
    console.log(`[DB] Retrying in ${delay}ms…`);
    await new Promise((r) => setTimeout(r, delay));
    return connectWithRetry(attempt + 1);
  }
}

const connectDb = async () => {
  mongoose.connection.on("disconnected", () =>
    console.warn("[DB] MongoDB disconnected — reconnecting automatically")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("[DB] MongoDB reconnected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("[DB] MongoDB error:", err.message)
  );

  await connectWithRetry();
};

export default connectDb;
