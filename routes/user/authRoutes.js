
import express from "express";
import multer from "multer";
import { register, login, updateProfile } from "../../controllers/user/authController.js";

const router = express.Router();

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({}); // temporary storage before uploading to Cloudinary
const upload = multer({ storage });

// ---------------- Routes ----------------
router.post("/register", register);
router.post("/login", login);

// Update profile route with file upload handling
router.put(
  "/update-profile/:userId",
  upload.fields([
    { name: "passport_size_photograph", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "identity_proof", maxCount: 1 },
    { name: "education_certificate", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
  ]),
  updateProfile
);

export default router;
