// import express from "express";
// import { createMockTest, getAllMockTests, getMockTestById,submitMockTest,getMockTestCount,getAdminDashboardCounts } from "../controllers/mockTestController.js";

// const router = express.Router();

// router.post("/create", createMockTest);
// router.get("/", getAllMockTests);
// router.get("/count-all", getAdminDashboardCounts); 
// router.get("/:id", getMockTestById);
// router.post("/submit", submitMockTest);
// router.get("/count", getMockTestCount); 


// export default router;

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  createMockTest,
  getAllMockTests,
  getMockTestById,
  submitMockTest,
  getAllSubmittedMockTests,
  getAdminDashboardCounts,
  deleteMockTest,
  updateMockTest,
  autoSaveMockTest,
  getAllMockTestsResults
} from "../controllers/mockTestController.js";

const router = express.Router();

// ---------- Multer Setup ----------
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ---------- Upload Fields for Image-Based Questions ----------
const questionImageFields = [];
for (let i = 0; i < 50; i++) {
  // support up to 50 images per mock test
  questionImageFields.push({ name: `questionImage_${i}`, maxCount: 10 });
  questionImageFields.push({ name: `questionImage_${i}_0`, maxCount: 10 });
  questionImageFields.push({ name: `questionImage_${i}_1`, maxCount: 10 });
  questionImageFields.push({ name: `questionImage_${i}_2`, maxCount: 10 });
}

// ---------------- Routes ----------------
router.post(
  "/create",
  upload.any(),   // <-- IMPORTANT!
  createMockTest
);
router.get("/", getAllMockTests);
router.get("/result", getAllMockTestsResults);

router.get("/count-all", getAdminDashboardCounts);
router.get("/submissions", getAllSubmittedMockTests);
router.get("/:id", getMockTestById);
router.post("/submit", submitMockTest);
router.post("/autosave", autoSaveMockTest);
router.delete("/delete/:id", deleteMockTest);

router.put("/edit/:id", upload.any(), updateMockTest);

// GET all submitted mock tests (for examiner dashboard)



export default router;

