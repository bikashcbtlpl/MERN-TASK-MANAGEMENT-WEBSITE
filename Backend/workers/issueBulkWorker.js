require("dotenv").config();

const dns = require("dns");
const mongoose = require("mongoose");
const issueBulkQueue = require("../queues/issueBulkQueue");
const processIssueCsvUpload = require("../utils/processIssueCsvUpload");

if (process.env.FORCE_GOOGLE_DNS === "true") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const connectMongoForWorker = async () => {
  if (mongoose.connection.readyState === 1) return;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set for issue bulk worker");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("[issueBulkWorker] MongoDB connected");
  } catch (err) {
    const canRetryWithDnsFallback =
      mongoUri.startsWith("mongodb+srv://") &&
      err?.code === "ECONNREFUSED" &&
      err?.syscall === "querySrv" &&
      process.env.MONGO_DNS_FALLBACK !== "disabled";

    if (!canRetryWithDnsFallback) {
      throw err;
    }

    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await mongoose.connect(mongoUri);
    console.log("[issueBulkWorker] MongoDB connected (DNS fallback)");
  }
};

const startIssueBulkWorker = async () => {
  if (!issueBulkQueue) {
    console.warn(
      "[issueBulkWorker] Redis disabled (REDIS_ENABLED=false). CSV uploads will be processed inline by API.",
    );
    return;
  }

  try {
    if (typeof issueBulkQueue.isReady === "function") {
      await issueBulkQueue.isReady();
    }
    await connectMongoForWorker();
  } catch (err) {
    console.error(
      "[issueBulkWorker] Startup dependency failed. Worker will not process jobs.",
      err?.message || err,
    );
    return;
  }

  issueBulkQueue.process(async (job) => {
    const { filePath, reportedBy } = job.data || {};
    const summary = await processIssueCsvUpload({
      filePath,
      reportedBy,
      batchSize: 10000,
      maxErrors: 100,
    });
    return summary;
  });

  issueBulkQueue.on("completed", (job) => {
    console.log(`[issueBulkWorker] Job ${job.id} completed`);
  });

  issueBulkQueue.on("failed", (job, err) => {
    console.error(`[issueBulkWorker] Job ${job?.id} failed: ${err.message}`);
  });

  console.log("[issueBulkWorker] Worker started (listening for CSV upload jobs)...");
};

module.exports = startIssueBulkWorker;
