const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================
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

    // ================= TASK STATUS =================
    taskStatus: {
      type: String,
      enum: ["Open", "In Progress", "On Hold", "Closed"],
      default: "Open",
    },

    // ================= SCHEDULE =================
    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    // ================= COMPLETION STATUS =================
    completionStatus: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },

    // ================= MEDIA =================
    images: [
      {
        type: String,
      },
    ],

    videos: [
      {
        type: String,
      },
    ],

    attachments: [
      {
        type: String,
      },
    ],

    // ================= EXTRA NOTES =================
    notes: {
      type: String,
      trim: true,
    },

    // ================= RELATIONS =================
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ================= VALIDATION RULES =================
taskSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();

  if (update.startDate && update.endDate) {
    if (new Date(update.endDate) < new Date(update.startDate)) {
      throw new Error("End date cannot be before start date");
    }
  }

  if (
    update.completionStatus === "Completed" &&
    update.taskStatus &&
    update.taskStatus !== "Closed"
  ) {
    throw new Error("Task must be Closed before marking as Completed");
  }
});

module.exports = mongoose.model("Task", taskSchema);
