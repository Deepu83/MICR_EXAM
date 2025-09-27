import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userAuthRoutes from "./routes/user/authRoutes.js";
import adminAuthRoutes from "./routes/admin/authRoutes.js";
//exam
import examRoutes from "./routes/examRoutes.js"; 
import examApplicationRoutes from "./routes/examApplicationRoutes.js";


dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use("/api/users/auth", userAuthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/exam-applications", examApplicationRoutes);
// Sample test route
app.get("/", (req, res) => res.send("🚀 Express + MongoDB running successfully!"));

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
