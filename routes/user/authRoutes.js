
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { register, login, updateProfile,getAllUsers, getUserById , adminMarkStepPassed} from "../../controllers/user/authController.js";

const router = express.Router();

// // ---------------- Multer Setup ----------------
// const tmpDir = path.join(process.cwd(), "tmp");
// if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, tmpDir),
//   filename: (req, file, cb) => {
//     const safeName = file.originalname.replace(/\s+/g, "_"); // remove spaces
//     cb(null, `${Date.now()}-${safeName}`);
//   },
// });
// Use current working directory for ES modules (__dirname alternative)
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir); // save all files in tmp folder
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // keep original extension
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`; // unique name per file
    cb(null, uniqueName);
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
      { name: "registrationCertificate", maxCount: 1 }, // NEW
    { name: "mbbsCertificate", maxCount: 1 }, // NEW
    { name: "pgCertificate", maxCount: 1 }, // NEW
  ]),
  updateProfile
);
// ---------------- GET all users ----------------
router.get("/users", getAllUsers);
router.get("/users/:userId", getUserById);

router.put("/users/progression", adminMarkStepPassed);

// export default router;
export default router;
