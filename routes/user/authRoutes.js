
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { register, login, updateProfile,getAllUsers, getUserById  } from "../../controllers/user/authController.js";

const router = express.Router();

// ---------------- Multer Setup ----------------
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_"); // remove spaces
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

// ---------------- Routes ----------------
router.post("/register", register);
router.post("/login", login);

// Update profile with files
router.put(
  "/update-profile/:userId",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "education", maxCount: 1 },
    { name: "address", maxCount: 1 },
  ]),
  updateProfile
);
// ---------------- GET all users ----------------
router.get("/users", getAllUsers);
router.get("/users/:userId", getUserById);

// export default router;
export default router;
