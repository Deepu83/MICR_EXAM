import express from "express";
import {
  getAllRegistrations,
  getRegistrationById,
  updateResult,
  getStepDetailsByApplicationId,
  createOrder,
  verifyPaymentAndRegister,
  getAdmitCard
} from "../controllers/ExamRegistrationController.js";

const router = express.Router();

// Routes
router.post("/create-order", createOrder);

router.post("/verify-payment", verifyPaymentAndRegister);

;
               // Create new registration
router.get("/", getAllRegistrations);                // Get all registrations
router.get("/:registrationId", getRegistrationById); // Get registration by ID
router.put("/result/:registrationId", updateResult); // Update result
router.get("/admit-card/:userId", getAdmitCard);
router.get("/step/:applicationId", getStepDetailsByApplicationId);

export default router;
