const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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
const Job = require("./models/Jobs");
const User = require("./models/Users");
const Verification = require("./models/Verification");

// Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "gigworker");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};

// ==================== AUTH ENDPOINTS ====================

// Register User (Worker or Association)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, role, workerId, associationId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const user = new User({
      email,
      password,
      role,
      workerId,
      associationId,
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "gigworker",
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .populate("workerId")
      .populate("associationId");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "gigworker",
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        workerId: user.workerId,
        associationId: user.associationId,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Login failed", error: error.message });
  }
});

// Get Current User Profile
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("workerId")
      .populate("associationId");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        workerId: user.workerId,
        associationId: user.associationId,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
});

// ==================== WORKER ENDPOINTS ====================

// Worker Dashboard - Get Assigned Jobs
app.get(
  "/api/worker/jobs",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const worker = await Worker.findById(
        req.user.workerId || req.query.workerId,
      );
      if (!worker) {
        return res
          .status(404)
          .json({ success: false, message: "Worker not found" });
      }

      const jobs = await Job.find({ workerId: worker._id }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        count: jobs.length,
        data: jobs,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Worker Dashboard - Get Earnings
app.get(
  "/api/worker/earnings",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const worker = await Worker.findById(
        req.user.workerId || req.query.workerId,
      );
      if (!worker) {
        return res
          .status(404)
          .json({ success: false, message: "Worker not found" });
      }

      const jobs = await Job.find({
        workerId: worker._id,
        status: "completed",
        "payment.status": "completed",
      });

      const totalEarnings = jobs.reduce(
        (sum, job) => sum + (job.payment?.amount || 0),
        0,
      );
      const pendingPayments = await Job.find({
        workerId: worker._id,
        status: "completed",
        "payment.status": "pending",
      });

      res.json({
        success: true,
        data: {
          totalEarnings,
          completedJobs: jobs.length,
          pendingPayments: pendingPayments.length,
          pendingAmount: pendingPayments.reduce(
            (sum, job) => sum + (job.payment?.amount || 0),
            0,
          ),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Worker Dashboard - Update Job Status
app.patch(
  "/api/worker/jobs/:jobId",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const job = await Job.findById(req.params.jobId);

      if (!job) {
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });
      }

      job.status = status;
      if (status === "completed") {
        job.payment = {
          ...job.payment,
          amount: req.body.amount || job.payment?.amount,
          status: "pending",
        };
      }

      await job.save();
      res.json({ success: true, message: "Job status updated", data: job });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ==================== ASSOCIATION ENDPOINTS ====================

// Association Dashboard - Get All Workers
app.get(
  "/api/association/workers",
  authMiddleware,
  roleMiddleware("association"),
  async (req, res) => {
    try {
      const association = await Association.findById(
        req.user.associationId || req.query.associationId,
      );
      if (!association) {
        return res
          .status(404)
          .json({ success: false, message: "Association not found" });
      }

      const workers = await Worker.find({ association: association.name });

      res.json({
        success: true,
        count: workers.length,
        data: workers,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Association Dashboard - Get Jobs for Association Workers
app.get(
  "/api/association/jobs",
  authMiddleware,
  roleMiddleware("association"),
  async (req, res) => {
    try {
      const association = await Association.findById(
        req.user.associationId || req.query.associationId,
      );
      if (!association) {
        return res
          .status(404)
          .json({ success: false, message: "Association not found" });
      }

      const workers = await Worker.find({ association: association.name });
      const workerIds = workers.map((w) => w._id);

      const jobs = await Job.find({ workerId: { $in: workerIds } }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        count: jobs.length,
        data: jobs,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Association Dashboard - Get Statistics
app.get(
  "/api/association/stats",
  authMiddleware,
  roleMiddleware("association"),
  async (req, res) => {
    try {
      const association = await Association.findById(
        req.user.associationId || req.query.associationId,
      );
      if (!association) {
        return res
          .status(404)
          .json({ success: false, message: "Association not found" });
      }

      const workers = await Worker.find({ association: association.name });
      const workerIds = workers.map((w) => w._id);

      const totalJobs = await Job.countDocuments({
        workerId: { $in: workerIds },
      });
      const completedJobs = await Job.countDocuments({
        workerId: { $in: workerIds },
        status: "completed",
      });
      const activeJobs = await Job.countDocuments({
        workerId: { $in: workerIds },
        status: "assigned",
      });

      res.json({
        success: true,
        data: {
          totalWorkers: workers.length,
          totalJobs,
          completedJobs,
          activeJobs,
          completionRate:
            totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ==================== VERIFICATION ENDPOINTS ====================

// Submit Verification Request
app.post(
  "/api/verification",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const { govtIdType, govtIdNumber, idImageUrl } = req.body;

      const worker = await Worker.findById(req.user.workerId);
      if (!worker) {
        return res
          .status(404)
          .json({ success: false, message: "Worker not found" });
      }

      const existing = await Verification.findOne({ workerId: worker._id });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Verification already submitted" });
      }

      const verification = new Verification({
        workerId: worker._id,
        govtIdType,
        govtIdNumber,
        idImageUrl,
        status: "pending",
      });

      await verification.save();

      res.status(201).json({
        success: true,
        message: "Verification request submitted",
        data: verification,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Verification failed",
        error: error.message,
      });
    }
  },
);

// Get Verification Status
app.get(
  "/api/verification",
  authMiddleware,
  roleMiddleware("worker"),
  async (req, res) => {
    try {
      const verification = await Verification.findOne({
        workerId: req.user.workerId,
      });

      if (!verification) {
        return res
          .status(404)
          .json({ success: false, message: "No verification request found" });
      }

      res.json({
        success: true,
        data: verification,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Approve Verification (Admin)
app.patch("/api/verification/:id/approve", authMiddleware, async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id);
    if (!verification) {
      return res
        .status(404)
        .json({ success: false, message: "Verification not found" });
    }

    verification.status = "verified";
    verification.verifiedAt = new Date();
    verification.verifiedBy = req.user.email;
    await verification.save();

    const user = await User.findOne({ workerId: verification.workerId });
    if (user) {
      user.isVerified = true;
      await user.save();
    }

    res.json({
      success: true,
      message: "Verification approved",
      data: verification,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT ENDPOINTS (DUMMY) ====================

// Process Payment (Dummy)
app.post("/api/payment", authMiddleware, async (req, res) => {
  try {
    const { jobId, amount, method } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    job.payment = {
      amount,
      method: method || "UPI",
      transactionId: `TXN${Date.now()}`,
      status: "completed",
      paidAt: new Date(),
    };
    job.status = "paid";
    await job.save();

    res.json({
      success: true,
      message: "Payment successful",
      data: {
        transactionId: job.payment.transactionId,
        amount,
        status: "completed",
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Payment failed",
      error: error.message,
    });
  }
});

// Get Payment History
app.get("/api/payment/history", authMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "worker") {
      const worker = await Worker.findById(req.user.workerId);
      query = { workerId: worker._id, "payment.status": "completed" };
    } else if (req.user.role === "customer") {
      query = { customerId: req.user.userId, "payment.status": "completed" };
    }

    const payments = await Job.find(query).sort({ "payment.paidAt": -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/jobs/random", async (req, res) => {
  try {
    const {
      serviceCategory,
      city,
      customerName,
      customerPhone,
      serviceAddress,
      jobDescription,
      preferredDate,
      preferredTime,
    } = req.body;

    let query = { serviceCategory, status: "approved" };
    if (city) {
      query.serviceAreas = { $regex: city, $options: "i" };
    }

    const workers = await Worker.find(query);

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workers available in this area",
      });
    }

    const randomWorker = workers[Math.floor(Math.random() * workers.length)];

    const job = new Job({
      workerId: randomWorker._id,
      workerName: randomWorker.name,
      workerPhone: randomWorker.phone,
      customerName,
      customerPhone,
      serviceAddress,
      serviceCategory,
      jobDescription,
      preferredDate,
      preferredTime,
      status: "assigned",
    });

    await job.save();

    res.status(201).json({
      success: true,
      message: "Worker assigned successfully",
      data: {
        job,
        worker: {
          name: randomWorker.name,
          phone: randomWorker.phone,
          serviceCategory: randomWorker.serviceCategory,
          rating: randomWorker.rating,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Allotment failed",
      error: error.message,
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

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

app.post("/api/jobs", async (req, res) => {
  try {
    const job = new Job(req.body);
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
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const totalAssociations = await Association.countDocuments();
    const totalJobs = await Job.countDocuments();
    const completedJobs = await Job.countDocuments({ status: "completed" });

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
