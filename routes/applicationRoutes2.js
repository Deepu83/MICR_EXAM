import express from "express";
import multer from "multer";
import { uploadApplicationZip, getApplicationByUsernames } from "../controllers/applicationController2.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("zipFile"), uploadApplicationZip);
// router.get("/username/:username", getApplicationByUsername);
// router.get("/username/:applicationNumber", getApplicationByUsername);


router.get("/username/:applicationNumber", getApplicationByUsernames);
export default router;
