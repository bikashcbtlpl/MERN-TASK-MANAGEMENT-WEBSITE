require("dotenv").config();
const Queue = require("bull");

const redisHost = (process.env.REDIS_HOST || "localhost").trim();
const redisPort = Number((process.env.REDIS_PORT || "6379").trim());

// Bull-compatible redis connection options
const redisOptions = {
  host: redisHost,
  port: redisPort,
  // Retry connection but cap retries so we don't spin forever
  retryStrategy(times) {
    if (times > 5) {
      // Stop retrying after 5 attempts — email is non-critical
      return null;
    }
    return Math.min(times * 1000, 5000);
  },
  enableOfflineQueue: false,
  connectTimeout: 5000,
  lazyConnect: true,
};

let emailQueue;

try {
  emailQueue = new Queue("emailQueue", {
    redis: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  emailQueue.on("error", (err) => {
    // Non-fatal: email queue errors should not crash the server
    if (err.code !== "ECONNREFUSED") {
      console.error("[emailQueue] Error:", err.message);
    }
  });

  emailQueue.on("failed", (job, err) => {
    console.error(`[emailQueue] Job ${job?.id} failed: ${err.message}`);
  });

  emailQueue.on("completed", (job) => {
    console.log(`[emailQueue] Job ${job?.id} completed successfully`);
  });
} catch (err) {
  console.warn("[emailQueue] Could not initialize email queue:", err.message);
  // Provide a no-op queue so the app doesn't crash
  emailQueue = {
    add: async (data) => {
      console.warn("[emailQueue] Queue unavailable. Email not sent:", data?.to);
    },
    process: () => { },
    on: () => { },
  };
}

module.exports = emailQueue;
