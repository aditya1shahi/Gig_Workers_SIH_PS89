const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      unique: true,
    },
    govtIdType: {
      type: String,
      enum: ["aadhar", "pan", "voter", "driving_license"],
      required: true,
    },
    govtIdNumber: { type: String, required: true },
    idImageUrl: { type: String }, // In production, store actual image URL
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Verification", verificationSchema);
