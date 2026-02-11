const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  smtpHost: String,
  smtpPort: Number,
  senderEmail: String,

  minPasswordLength: {
    type: Number,
    default: 6,
  },
  enableRegistration: {
    type: Boolean,
    default: true,
  },
  sessionTimeout: {
    type: Number,
    default: 30,
  },
});

module.exports = mongoose.model("Settings", settingsSchema);
