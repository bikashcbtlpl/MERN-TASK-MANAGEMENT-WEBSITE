require("dotenv").config();

const emailQueue = require("../queues/emailQueue");
const sendEmail = require("../utils/sendEmail");

/* =====================================================
   📧 PROCESS EMAIL JOBS
===================================================== */

const startWorker = async () => {
  if (emailQueue.isNoop) {
    console.warn(
      "[emailWorker] Queue is in direct-send mode (REDIS_ENABLED != true). No background jobs will be processed here.",
    );
    return;
  }

  try {
    // For Bull queues, ensure Redis connection is ready before registering processor.
    if (typeof emailQueue.isReady === "function") {
      await emailQueue.isReady();
    }
  } catch (err) {
    console.error(
      "[emailWorker] Redis is not reachable. Worker will not process jobs.",
      err?.message || err,
    );
    return;
  }

  emailQueue.process(async (job) => {
    try {
      const { to, subject, text } = job.data;

      console.log("📨 Processing email job...");
      console.log("To:", to);

      await sendEmail(to, subject, text);

      console.log("✅ Email sent successfully");
      return true;
    } catch (error) {
      console.error("❌ Email job failed:", error);
      throw error;
    }
  });

  console.log("📬 Email worker started (listening for jobs)...");
};

startWorker().catch((err) => {
  console.error("[emailWorker] Startup error:", err);
});
