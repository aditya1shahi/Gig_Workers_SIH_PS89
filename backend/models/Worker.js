const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    yearsOfExperience: { type: Number, required: true },
    association: { type: String, required: true },
    serviceAreas: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    hourlyRate: { type: Number, required: true },
    skills: { type: String, default: "" },
    status: { type: String, default: "approved" }, // pending, approved, rejected
    rating: { type: Number, default: 4.5 },
    jobsCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Worker", workerSchema);
