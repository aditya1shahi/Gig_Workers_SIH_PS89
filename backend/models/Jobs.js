const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    workerName: { type: String, required: true },
    workerPhone: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    serviceAddress: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    jobDescription: { type: String, required: true },
    preferredDate: { type: Date },
    preferredTime: { type: String },
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed", "cancelled", "paid"],
      default: "assigned",
    },
    payment: {
      amount: { type: Number },
      method: { type: String },
      transactionId: { type: String },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      paidAt: { type: Date },
    },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Job", jobSchema);
