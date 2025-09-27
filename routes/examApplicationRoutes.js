// routes/examApplicationRoutes.js
import express from "express";
import {
  applyExam,
  getAllApplications,
  getUserApplications,
  updateApplicationStatus,
} from "../controllers/examApplicationController.js";

const router = express.Router();

// User applies for an exam
router.post("/apply", applyExam);

// Get all applications (admin use)
router.get("/", getAllApplications);

// Get applications by user
router.get("/user/:userId", getUserApplications);

// Update application status (admin use)
router.put("/:id", updateApplicationStatus);

export default router;
