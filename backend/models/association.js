const mongoose = require("mongoose");

const associationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    workerCategories: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Association", associationSchema);
