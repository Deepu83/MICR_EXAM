import express from "express";
import {
  createRegistration,
  getAllRegistrations,
  getRegistrationById,
  updateResult,
  getStepDetailsByApplicationId,
} from "../controllers/ExamRegistrationController.js";

const router = express.Router();

// Routes
router.post("/", createRegistration);                 // Create new registration
router.get("/", getAllRegistrations);                // Get all registrations
router.get("/:registrationId", getRegistrationById); // Get registration by ID
router.put("/result/:registrationId", updateResult); // Update result

router.get("/step/:applicationId", getStepDetailsByApplicationId);

export default router;
