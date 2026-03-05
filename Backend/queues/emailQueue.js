require("dotenv").config();

/* =====================================================
   📧 EMAIL QUEUE
   Uses Bull (Redis-backed) when REDIS_ENABLED=true.
   Falls back silently to a no-op when Redis is off.
===================================================== */

// Safe no-op stub — never throws, never rejects
const noopQueue = {
  add: (_data) => {
    // Silently drop — email queue is disabled
    return Promise.resolve(null);
  },
  process: () => {},
  on: () => {},
  close: () => Promise.resolve(),
};

const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";

if (!REDIS_ENABLED) {
  console.warn(
    "[emailQueue] Redis disabled (REDIS_ENABLED != true) — emails will be skipped.",
  );
  module.exports = noopQueue;
} else {
  // Only load Bull when explicitly enabled
  const Queue = require("bull");

  const redisHost = (process.env.REDIS_HOST || "127.0.0.1").trim();
  const redisPort = Number((process.env.REDIS_PORT || "6379").trim());

  const redisOptions = {
    host: redisHost,
    port: redisPort,
    retryStrategy(times) {
      if (times > 3) return null; // stop reconnecting after 3 tries
      return Math.min(times * 1000, 3000);
    },
    enableOfflineQueue: false,
    connectTimeout: 5000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  };

  let emailQueue;

  try {
    emailQueue = new Queue("emailQueue", {
      redis: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
      settings: { stalledInterval: 0 },
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
  } catch (err) {
    console.warn("[emailQueue] Init failed, using no-op:", err.message);
    emailQueue = noopQueue;
  }

  module.exports = emailQueue;
}
