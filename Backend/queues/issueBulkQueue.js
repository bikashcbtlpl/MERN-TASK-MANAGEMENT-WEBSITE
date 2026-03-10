require("dotenv").config();

const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";

if (!REDIS_ENABLED) {
  module.exports = null;
} else {
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

  const issueBulkQueue = new Queue("issueBulkQueue", {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
    settings: {
      stalledInterval: 30000,
      lockDuration: 30000,
      maxStalledCount: 1,
    },
  });

  const suppressRedisError = (err) => {
    if (err.code !== "ECONNREFUSED" && err.code !== "ETIMEDOUT") {
      console.error("[issueBulkQueue] Redis client error:", err.message);
    }
  };

  issueBulkQueue.client.on("error", suppressRedisError);
  issueBulkQueue.on("ready", () => {
    try {
      if (issueBulkQueue.subscriber) issueBulkQueue.subscriber.on("error", suppressRedisError);
      if (issueBulkQueue.bclient) issueBulkQueue.bclient.on("error", suppressRedisError);
    } catch {
      // Ignore optional client event registration issues.
    }
  });

  issueBulkQueue.on("error", (err) => {
    if (err.code !== "ECONNREFUSED" && err.code !== "ETIMEDOUT") {
      console.error("[issueBulkQueue] Queue error:", err.message);
    }
  });

  module.exports = issueBulkQueue;
}
