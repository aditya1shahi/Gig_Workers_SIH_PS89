const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    yearsOfExperience: { type: Number, required: true },
    association: { type: String, required: false },
    serviceAreas: { type: String, required: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    govtID: { type: String, required: true }, // NEW: mandatory Govt ID (Aadhaar/PAN/Voter/DL)
    hourlyRate: { type: Number, required: true },
    skills: { type: String, default: "" },
    status: { type: String, default: "approved" }, // pending, approved, rejected
    rating: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Worker", workerSchema);
