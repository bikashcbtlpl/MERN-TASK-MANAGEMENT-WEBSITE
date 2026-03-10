const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    module: {
      type: String,
      enum: ["Auth", "Payment", "Dashboard", "Task", "Project", "Role", "Permission", "Other"],
      default: "Auth",
    },

    attachmentName: {
      type: String,
      trim: true,
      default: "",
    },

    attachmentUrl: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Issue", issueSchema);
