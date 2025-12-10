import express from "express";
import multer from "multer";
import { uploadApplicationZip, getApplicationByUsername } from "../controllers/applicationController.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("zipFile"), uploadApplicationZip);
// router.get("/username/:username", getApplicationByUsername);
// router.get("/username/:applicationNumber", getApplicationByUsername);


router.get("/username/:applicationNumber", getApplicationByUsername);
export default router;
