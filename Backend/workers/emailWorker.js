require("dotenv").config();

const emailQueue = require("../queues/emailQueue");
const sendEmail = require("../utils/sendEmail");

/* =====================================================
   📧 PROCESS EMAIL JOBS
===================================================== */

// If Redis is disabled, emailQueue.process is a no-op — safe to call
emailQueue.process(async (job) => {
  try {
    const { to, subject, text } = job.data;

    console.log("📨 Processing email job...");
    console.log("To:", to);

    await sendEmail(to, subject, text);

    console.log("✅ Email sent successfully");

    return true; // Important for Bull to mark job complete
  } catch (error) {
    console.error("❌ Email job failed:", error);
    throw error; // Let Bull retry job
  }
});

console.log("📬 Email worker started (listening for jobs)...");
