require("dotenv").config();
const mongoose = require("mongoose");
const Worker = require("./models/Worker");
const delhiWorkers = require("./data/delhiWorkers");

async function seedWorkers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const worker of delhiWorkers) {
      await Worker.updateOne(
        { email: worker.email },
        { $set: worker },
        { upsert: true },
      );
    }

    console.log("Delhi worker dataset seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedWorkers();
