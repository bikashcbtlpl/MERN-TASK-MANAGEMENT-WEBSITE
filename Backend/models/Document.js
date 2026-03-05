const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    attachments: [{ type: String }],
    access: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // accessType: 'view' or 'edit'
        accessType: { type: String, enum: ["view", "edit"], default: "view" },
      },
    ],
    accessRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", DocumentSchema);
