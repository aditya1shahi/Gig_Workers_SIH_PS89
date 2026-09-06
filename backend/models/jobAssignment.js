const mongoose = require("mongoose");

const jobAssignmentSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    workerName: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    serviceAddress: { type: String, required: true },
    jobDescription: { type: String, required: true },
    preferredDate: { type: Date },
    preferredTime: { type: String },
    status: { type: String, default: "assigned" }, // assigned, in-progress, completed, cancelled
  },
  { timestamps: true },
);

module.exports = mongoose.model("JobAssignment", jobAssignmentSchema);
