const nodemailer = require("nodemailer");

/**
 * Sends an email using Nodemailer + Gmail (or configured SMTP).
 * Throws on failure so callers can handle appropriately.
 */
const sendEmail = async (to, subject, text, html = null) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn(
      "[sendEmail] EMAIL_USER or EMAIL_PASS not configured — skipping email",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"Task Management System" <${user}>`,
    to,
    subject,
    text,
    ...(html && { html }),
  };

  await transporter.sendMail(mailOptions);
  console.log(`[sendEmail] Email sent to ${to}`);
};

module.exports = sendEmail;
