require("dotenv").config();
const sendEmail = require("../utils/sendEmail");

/* =====================================================
   📧 EMAIL QUEUE
   Uses Bull (Redis-backed) when REDIS_ENABLED=true.
   Falls back silently to a no-op when Redis is off.
===================================================== */

// Safe no-op stub — never throws, never rejects
const noopQueue = {
  mode: "direct",
  isNoop: true,
  add: (data = {}) => {
    // Redis queue disabled: send directly from API process as fallback.
    const { to, subject, text } = data;
    if (!to || !subject || !text) return Promise.resolve(null);

    return sendEmail(to, subject, text).catch((err) => {
      console.error("[emailQueue-fallback] Direct send failed:", err?.message);
      return null;
    });
  },
  process: () => {},
  on: () => {},
  close: () => Promise.resolve(),
};

const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";

if (!REDIS_ENABLED) {
  console.warn(
    "[emailQueue] Redis disabled (REDIS_ENABLED != true) — emails are sent directly by API process; worker will stay idle.",
  );
  module.exports = noopQueue;
} else {
  // Only load Bull when explicitly enabled
  const Queue = require("bull");
  const redisUrl = (process.env.REDIS_URL || "").trim();
  const redisHost = (process.env.REDIS_HOST || "127.0.0.1").trim();
  const redisPort = Number((process.env.REDIS_PORT || "6379").trim());
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  const baseRedisOptions = {
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 1000, 5000);
    },
    // Allow commands to queue briefly while Redis connection is being established.
    // Prevents worker crash: "Stream isn't writeable and enableOfflineQueue options is false"
    enableOfflineQueue: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  };

  const redisConfig = redisUrl
    ? redisUrl
    : {
        ...baseRedisOptions,
        host: redisHost,
        port: redisPort,
        ...(redisPassword ? { password: redisPassword } : {}),
      };

  let emailQueue;

  try {
    emailQueue = new Queue("emailQueue", {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
      settings: {
        // Must be positive; 0 can produce Redis "invalid expire time" in Bull scripts.
        stalledInterval: 30000,
        lockDuration: 30000,
        maxStalledCount: 1,
      },
    });

    // Suppress ECONNREFUSED so it never crashes the server
    emailQueue.client.on("error", (err) => {
      if (err.code !== "ECONNREFUSED") {
        console.error("[emailQueue] Redis client error:", err.message);
      }
    });

    emailQueue.on("error", (err) => {
      if (err.code !== "ECONNREFUSED") {
        console.error("[emailQueue] Queue error:", err.message);
      }
    });

    emailQueue.on("failed", (job, err) => {
      console.error(`[emailQueue] Job ${job?.id} failed: ${err.message}`);
    });

    emailQueue.on("completed", (job) => {
      console.log(`[emailQueue] Job ${job?.id} completed`);
    });

    console.log(
      `[emailQueue] Enabled (${redisUrl ? "REDIS_URL" : `${redisHost}:${redisPort}`})`,
    );
    emailQueue.mode = "redis";
    emailQueue.isNoop = false;
  } catch (err) {
    console.warn("[emailQueue] Init failed, using no-op:", err.message);
    emailQueue = noopQueue;
  }

  module.exports = emailQueue;
}
