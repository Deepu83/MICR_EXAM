import express from "express";
import { createMockTest, getAllMockTests, getMockTestById,submitMockTest } from "../controllers/mockTestController.js";

const router = express.Router();

router.post("/create", createMockTest);
router.get("/", getAllMockTests);
router.get("/:id", getMockTestById);
router.post("/submit", submitMockTest);

export default router;
