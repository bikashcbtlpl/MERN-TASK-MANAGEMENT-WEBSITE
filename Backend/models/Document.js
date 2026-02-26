const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    attachments: [{ type: String }],
    access: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    accessRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
