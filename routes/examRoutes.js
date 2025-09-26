import express from "express";
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} from "../controllers/examController.js";   // <-- added .js

const router = express.Router();

// Create exam
router.post("/", createExam);

// Get all exams
router.get("/", getExams);

// Get exam by ID
router.get("/:id", getExamById);

// Update exam
router.put("/:id", updateExam);

// Delete exam
router.delete("/:id", deleteExam);

export default router;
