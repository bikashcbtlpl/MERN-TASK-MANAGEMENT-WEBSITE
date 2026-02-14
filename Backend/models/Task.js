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
    images: [{ type: String }],
    videos: [{ type: String }],
    attachments: [{ type: String }],

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

/* =====================================================
   🔒 VALIDATION ON CREATE / SAVE
===================================================== */
taskSchema.pre("save", function () {
  if (this.startDate && this.endDate) {
    if (this.endDate < this.startDate) {
      throw new Error("End date cannot be before start date");
    }
  }

  if (
    this.completionStatus === "Completed" &&
    this.taskStatus !== "Closed"
  ) {
    throw new Error(
      "Task must be Closed before marking as Completed"
    );
  }
});

/* =====================================================
   🔒 VALIDATION ON UPDATE (SAFE + NO CRASH)
===================================================== */
taskSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const data = update.$set || update;

  const startDate = data.startDate;
  const endDate = data.endDate;
  const taskStatus = data.taskStatus;
  const completionStatus = data.completionStatus;

  if (startDate && endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error("End date cannot be before start date");
    }
  }

  if (
    completionStatus === "Completed" &&
    taskStatus &&
    taskStatus !== "Closed"
  ) {
    throw new Error(
      "Task must be Closed before marking as Completed"
    );
  }
});

module.exports = mongoose.model("Task", taskSchema);
