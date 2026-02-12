require("dotenv").config()
const emailQueue = require("../queues/emailQueue");
const sendEmail = require("../utils/sendEmail");

emailQueue.process(async (job) => {
  const { to, subject, text } = job.data;

  console.log("Processing email job...");

  await sendEmail(to, subject, text);

  console.log("Email sent successfully");
});