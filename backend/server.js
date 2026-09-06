const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gigworker_db?retryWrites=true&w=majority";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Models
const Association = require("./models/association");
const Worker = require("./models/Worker");
const JobAssignment = require("./models/jobAssignment");

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Associations
app.post("/api/associations", async (req, res) => {
  try {
    const association = new Association(req.body);
    await association.save();
    res.status(201).json({
      success: true,
      message: "Association registered",
      data: association,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error registering association",
      error: error.message,
    });
  }
});

app.get("/api/associations", async (req, res) => {
  try {
    const associations = await Association.find().sort({ createdAt: -1 });
    res.json({ success: true, count: associations.length, data: associations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Workers
app.post("/api/workers", async (req, res) => {
  try {
    const worker = new Worker(req.body);
    await worker.save();
    res
      .status(201)
      .json({ success: true, message: "Worker registered", data: worker });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error registering worker",
      error: error.message,
    });
  }
});

app.get("/api/workers", async (req, res) => {
  try {
    const { service, city } = req.query;
    let query = {};
    if (service) query.serviceCategory = service;

    const workers = await Worker.find(query).sort({ createdAt: -1 });

    let filtered = workers;
    if (city) {
      filtered = workers.filter((w) =>
        w.serviceAreas.toLowerCase().includes(city.toLowerCase()),
      );
    }

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Jobs
app.post("/api/jobs", async (req, res) => {
  try {
    const job = new JobAssignment(req.body);
    await job.save();

    await Worker.findByIdAndUpdate(req.body.workerId, {
      $inc: { jobsCompleted: 1 },
    });

    res.status(201).json({ success: true, message: "Job assigned", data: job });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error assigning job",
      error: error.message,
    });
  }
});

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await JobAssignment.find().sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
app.get("/api/stats", async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const totalAssociations = await Association.countDocuments();
    const totalJobs = await JobAssignment.countDocuments();
    const completedJobs = await JobAssignment.countDocuments({
      status: "completed",
    });

    res.json({
      success: true,
      data: {
        totalWorkers,
        totalAssociations,
        totalJobs,
        completedJobs,
        satisfactionRate:
          totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 98,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
