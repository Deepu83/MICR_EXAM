import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import { generateRegisterNo } from "../../utils/generateRegisterNo.js";
import cloudinary from "../../config/cloudinary.js";
const JWT_SECRET = process.env.JWT_SECRET || "860bafe47a1d1e7e81a54e72a7aa9d35721517fc2d259f61df9c0a8441a1e5f75343d33c70042ba2d6154f5cbb239f741fd7e2916dfbde87901ae9522cbbb78a";
const JWT_EXPIRES = "1d"; // token expiry
// Register new user
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ msg: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 🔥 Generate sequential register number
    const registerNo = await generateRegisterNo();
    console.log(registerNo,"asdlifhaukisdhfguiasdhgfuioasheduoig");

    const user = await User.create({
      email,
      passwordHash,
      registerNo, // save MICR-style unique ID
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    res.status(201).json({
      token,
      userId: user._id,
      email: user.email,
      registerNo: user.registerNo,
      profile: user.profile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Login existing user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    res
      .status(200)
      .json({ token, userId: user._id, email: user.email, Login: "success" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};





export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Parse JSON fields
    const application = req.body.application
      ? typeof req.body.application === "string"
        ? JSON.parse(req.body.application)
        : req.body.application
      : {};
    const education = req.body.education
      ? typeof req.body.education === "string"
        ? JSON.parse(req.body.education)
        : req.body.education
      : {};

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Initialize documents
    const uploadedDocuments = { ...(user.profile?.documents || {}) };

    if (req.files && Object.keys(req.files).length > 0) {
      const folderMap = {
        photo: "users/photo",
        signature: "users/signature",
        id_proof: "users/identity",
        education: "users/education",
        address: "users/address",
      };

      console.log("Files received:", req.files);

      for (const key in req.files) {
        if (req.files[key].length > 0) {
          const file = req.files[key][0];
          const filePath = path.resolve(file.path);

          // Upload to Cloudinary
          const upload = await cloudinary.uploader.upload(filePath, {
            folder: folderMap[key] || "users",
          });

          console.log("Cloudinary upload result:", upload); // 🔥 check URL

          uploadedDocuments[key] = {
            url: upload.secure_url,      // actual Cloudinary URL
            public_id: upload.public_id,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            lastModified: new Date(),
          };

          // Delete local tmp file
          fs.unlinkSync(filePath);
        }
      }
    }

    // Save profile
    user.profile = {
      ...(user.profile ? user.profile.toObject() : {}),
      application: { ...(user.profile?.application || {}), ...application },
      education: { ...(user.profile?.education || {}), ...education },
      documents: uploadedDocuments,
      profileCompletedAt: new Date(),
    };

    user.profileCompleted = true;
    await user.save();

    res.status(200).json({
      msg: "Profile updated successfully",
      profile: user.profile,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};