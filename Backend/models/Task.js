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
      enum: [
        "Open",
        "In Progress",
        "Pending",
        "On Hold",
        "Closed",
        "Completed",
        "Cancelled",
      ],
      default: "Open",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ================= SCHEDULE =================
    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
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
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
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
});

/* =====================================================
   🔒 VALIDATION ON UPDATE (SAFE + NO CRASH)
===================================================== */
taskSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const data = update.$set || update;

  const startDate = data.startDate;
  const endDate = data.endDate;

  if (startDate && endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error("End date cannot be before start date");
    }
  }
});

module.exports = mongoose.model("Task", taskSchema);
