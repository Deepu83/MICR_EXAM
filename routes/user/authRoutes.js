
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  register, login, updateProfile, getAllUsers, getUserById, adminMarkStepPassed, requestProfileEdit,
  approveProfileEdit,sendProfileUpdateOTP,getEditRequests,getDashboardStats,updateExamStatusByRegisterNo,editApprovedFields
} from "../../controllers/user/authController.js";
import { protect} from "../../middleware/authMiddleware.js";


const router = express.Router();


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
  protect,
  upload.any(),   // <-- THIS
  updateProfile
);

// router.put(
//   "/update-profile/:userId",protect,
//   upload.fields([
//     { name: "photo", maxCount: 1 },
//     { name: "signature", maxCount: 1 },
//     { name: "id_proof", maxCount: 1 },
//     { name: "education", maxCount: 1 },
//     { name: "address", maxCount: 1 },
//     { name: "registrationCertificate", maxCount: 1 }, // NEW
//     { name: "mbbsCertificate", maxCount: 1 }, // NEW
//     { name: "pgCertificate", maxCount: 1 }, // NEW

//       { name: "otherCertificate_0", maxCount: 1 },
//     { name: "otherCertificate_1", maxCount: 1 },
//     { name: "otherCertificate_2", maxCount: 1 },
//     { name: "otherCertificate_3", maxCount: 1 },
//   ]),
//   updateProfile
// );

//
// 🟡 NEW: Request to edit profile (with file uploads, pending admin approval)
router.put(
  "/request-edit/:userId",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "education", maxCount: 1 },
    { name: "address", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "mbbsCertificate", maxCount: 1 },
    { name: "pgCertificate", maxCount: 1 },
  ]),
  requestProfileEdit
);

router.put("/edit-approved/:userId" , upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "education", maxCount: 1 },
    { name: "address", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "mbbsCertificate", maxCount: 1 },
    { name: "pgCertificate", maxCount: 1 },
  ]), editApprovedFields);


// 🟢 NEW: Admin approves/rejects edit request
router.put("/approve-edit/:userId", approveProfileEdit);
router.post("/update-status-by-register", updateExamStatusByRegisterNo);

// ---------------- GET all users ----------------
router.get("/users", getAllUsers);
router.get("/edit/requests", getEditRequests); // 👈 New route
router.get("/users/:userId", getUserById);
router.get("/dashboard-stats",protect, getDashboardStats);


router.put("/users/progression", adminMarkStepPassed);

//otp
router.post("/send-otp/:userId",protect, sendProfileUpdateOTP);

// export default router;
export default router;
