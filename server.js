import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userAuthRoutes from "./routes/user/authRoutes.js";
import adminAuthRoutes from "./routes/admin/authRoutes.js";
//exam
import cors from "cors"; // <-- import cors
import examRoutes from "./routes/examRoutes.js"; 
import examApplicationRoutes from "./routes/examApplicationRoutes.js";
import examRegistrationRoutes from "./routes/ExamRegistrationRoutes.js";
// number of CPU cores
import mockTestRoutes from "./routes/mockTestRoutes.js";
import cookieParser from "cookie-parser";

import applicationRoutes from "./routes/applicationRoutes.js";
// import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";
import applicationRoutes2 from "./routes/applicationRoutes2.js"

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());



//express rate limit globally 
// const limiter = rateLimit({
//   windowMs: 10 * 1000, // 10 seconds
//   max: 10,
//   message: "Too many requests, try again later",
// });
const tokenBucket = new RateLimiterMemory({
  points: 1000,          // 5 requests allowed
  duration: 10,       // refill bucket every 10 seconds
  blockDuration: 5,   // block for 5 seconds after limit reached
});


export const tokenBucketMiddleware = async (req, res, next) => {
  try {
    await tokenBucket.consume(req.ip); // consume 1 token per request
    next();
  } catch (err) {
    res.status(429).json({
      success: false,
      message: "Too many requests (Token Bucket). Try again later!",
    });
  }
};


// Apply globally
app.use(tokenBucketMiddleware);
// Routes
app.use("/api/users/auth", userAuthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api", examRoutes);
app.use("/api/exam-applications", examApplicationRoutes);
app.use("/api/registrations", examRegistrationRoutes);
app.use("/api/mocktests", mockTestRoutes);

//for zip fiel 
app.use("/api/application", applicationRoutes);
app.use("/api/application2",applicationRoutes2);
// Sample test route
app.get("/", (req, res) => res.send("🚀 Express + MongoDB running successfully!"));
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
// Start server after DB connection
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`⚡ Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
  }
};


startServer();
