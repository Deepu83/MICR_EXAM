import express from "express";
import { createExam, getAllExams, getExamByCode,deleteExam,updateExam } from "../controllers/examController.js";

const router = express.Router();

router.post("/exams", createExam);
router.get("/exams", getAllExams);
router.get("/exams/:code", getExamByCode);
router.delete("/exams/:code",deleteExam);

router.put("/exams/:code",updateExam);


export default router;
