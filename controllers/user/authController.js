
// import User from "../../models/User.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import fs from "fs";
// import path from "path";
// import { generateRegisterNo } from "../../utils/generateRegisterNo.js";
// import cloudinary from "../../config/cloudinary.js";

import dotenv from "dotenv";
dotenv.config(); // Make sure env variables are loaded at the very top
// import { sendSMS } from "../../utils/sendWhatsApp.js"; // import our utility
import { sendWhatsApp } from "../../utils/sendWhatsApp.js";
import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { generateRegisterNo } from "../../utils/generateRegisterNo.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "860bafe47a1d1e7e81a54e72a7aa9d35721517fc2d259f61df9c0a8441a1e5f75343d33c70042ba2d6154f5cbb239f741fd7e2916dfbde87901ae9522cbbb78a";
const JWT_EXPIRES = "1d";

// ✅ Configure Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify transporter once when the server starts
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter configuration error:", error);
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});

// ✅ Register new user
export const register = async (req, res) => {
  try {
    const { name, aadhaarNumber, mobileNumber, email, password } = req.body;

    // Validate required fields
    if (!name || !aadhaarNumber || !mobileNumber || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Validate email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Missing email credentials in .env");
      return res
        .status(500)
        .json({ msg: "Email credentials not configured on server" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Check if Aadhaar already exists
    const existingAadhaar = await User.findOne({ aadhaarNumber });
    if (existingAadhaar) {
      return res.status(400).json({ msg: "Aadhaar number already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate sequential register number
    const registerNo = await generateRegisterNo();

    // Create new user
    const user = await User.create({
      name,
      aadhaarNumber,
      mobileNumber,
      email,
      passwordHash,
      registerNo,
    });
// After creating user
const waMessage = `Hello ${user.name}, your registration is successful! Reg No: ${user.registerNo}`;
await sendWhatsApp("918057509308", waMessage);
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    // ✅ Prepare mail
    const mailOptions = {
      from: `"Cognoscente Invented Pvt. Ltd." <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Registration Successful ✅",
      html: `
        <h2>Welcome, ${user.name}!</h2>
        <p>You have successfully registered with <strong>Cognoscente Invented Pvt. Ltd.</strong>.</p>
        <h3>Your Details:</h3>
        <ul>
          <li><strong>Register No:</strong> ${user.registerNo}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Mobile:</strong> ${user.mobileNumber}</li>
          <li><strong>Aadhaar:</strong> ${user.aadhaarNumber}</li>
        </ul>
        <p>Thank you for registering. You can now log in using your credentials.</p>
        <br/>
        <p>Best regards,<br/>Cognoscente Invented Pvt. Ltd. Team</p>
      `,
    };

    // ✅ Send email with proper try/catch
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("📩 Email sent successfully:", info.response);
    } catch (emailError) {
      console.error("❌ Error sending email:", emailError);
      // User registration still succeeds even if email fails
    }

    // ✅ Final Response
    res.status(201).json({
      msg: "User registered successfully (email sent if no error logged above)",
      token,
      userId: user._id,
      name: user.name,
      aadhaarNumber: user.aadhaarNumber,
      mobileNumber: user.mobileNumber,
      email: user.email,
      registerNo: user.registerNo,
      profile: user.profile,
     
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

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

    res.status(200).json({
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
        registerNo: user.registerNo,
      aadhaarNumber: user.aadhaarNumber,
registerNo:user.registerNo,
      progression: user.progression || {},
       profileCompleted:user.profileCompleted,
      Login: "success",
    });
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
    user.progression = {
  ...(user.progression ? user.progression.toObject() : {}),
  currentLevel: 1, // STEP-1 now available after profile update
  step1: {
    ...(user.progression?.step1 || {}),
    papers: { ...(user.progression?.step1?.papers || {}) },
    overallStatus: user.progression?.step1?.overallStatus || "not_started",
    completedDate: user.progression?.step1?.completedDate || null,
    allPapersPassed: user.progression?.step1?.allPapersPassed || false,
  },
  step2: {
    ...(user.progression?.step2 || {}),
  },
  step3: {
    ...(user.progression?.step3 || {}),
  },
};


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


// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      msg: "All users fetched successfully",
      users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// GET user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({
      msg: "User fetched successfully",
      user,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
//logic of passed 

export const markStepPassed = async (userId, step) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();

  switch (step) {
    case "step1":
      user.progression.step1.status = "passed";
      user.progression.step1.completedDate = now;
      user.progression.currentLevel = 2;
      user.progression.step2.status = "not_started";
      break;
    case "step2":
      user.progression.step2.status = "passed";
      user.progression.step2.completedDate = now;
      user.progression.currentLevel = 3;
      user.progression.step3A.status = "not_started";
      user.progression.step3B.status = "not_started";
      break;
    case "step3A":
      user.progression.step3A.status = "passed";
      user.progression.step3A.completedDate = now;
      break;
    case "step3B":
      user.progression.step3B.status = "passed";
      user.progression.step3B.completedDate = now;
      break;
  }

  if (
    user.progression.step1.status === "passed" &&
    user.progression.step2.status === "passed" &&
    user.progression.step3A.status === "passed" &&
    user.progression.step3B.status === "passed"
  ) {
    user.progression.allStepsCompleted = true;
    user.progression.completionDate = now;
  }

  await user.save();
  return user.progression;
};




export const adminMarkStepPassed = async (req, res) => {
  try {
    const { userId, applicationId } = req.body;

    if (!userId) {
      return res.status(400).json({ msg: "userId is required" });
    }

    if (!applicationId) {
      return res.status(400).json({ msg: "applicationId is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const now = new Date();
    if (!user.progression) user.progression = {};

    let found = false;

    // Helper to safely mark any paper as passed
    const markPaper = (paper = {}) => {
      if (paper.applicationId === applicationId) {
        found = true;
        return { ...paper, status: "passed", completedDate: now, applicationId: paper.applicationId };
      }
      return paper;
    };

    // Step 1
    if (!user.progression.step1) user.progression.step1 = {};
    if (!user.progression.step1.papers) user.progression.step1.papers = {};
    user.progression.step1.papers.paper1 = markPaper(user.progression.step1.papers.paper1 || {});
    user.progression.step1.papers.paper2 = markPaper(user.progression.step1.papers.paper2 || {});
    if (
      user.progression.step1.papers.paper1.status === "passed" ||
      user.progression.step1.papers.paper2.status === "passed"
    ) {
      user.progression.step1.status = "passed";
      user.progression.step1.completedDate = now;
      user.progression.step1.overallStatus = "passed";
    }

    // Step 2
    if (!user.progression.step2) user.progression.step2 = {};
    if (user.progression.step2.papers) {
      for (const key in user.progression.step2.papers) {
        user.progression.step2.papers[key] = markPaper(user.progression.step2.papers[key]);
      }
      if (Object.values(user.progression.step2.papers).some(p => p.status === "passed")) {
        user.progression.step2.status = "passed";
        user.progression.step2.completedDate = now;
        user.progression.step2.overallStatus = "passed";
      }
    }
    if (user.progression.step2.applicationId === applicationId) {
      user.progression.step2.status = "passed";
      user.progression.step2.completedDate = now;
      user.progression.step2.overallStatus = "passed";
      found = true;
    }

    // Step 3
    if (!user.progression.step3) user.progression.step3 = {};
    if (!user.progression.step3.partA) user.progression.step3.partA = {};
    if (!user.progression.step3.partB) user.progression.step3.partB = {};

    user.progression.step3.partA = markPaper(user.progression.step3.partA);
    user.progression.step3.partB = markPaper(user.progression.step3.partB);

    if (!found) {
      return res.status(404).json({ msg: "ApplicationId not exist in user progression" });
    }

    // Update currentLevel
    if (user.progression.step1.status === "passed") user.progression.currentLevel = 2;
    if (user.progression.step2.status === "passed") user.progression.currentLevel = 3;

    // Check if all steps completed
    const allStepsPassed =
      user.progression.step1?.status === "passed" &&
      user.progression.step2?.status === "passed" &&
      user.progression.step3.partA?.status === "passed" &&
      user.progression.step3.partB?.status === "passed";

    if (allStepsPassed) {
      user.progression.allStepsCompleted = true;
      user.progression.completionDate = now;
    }

    await user.save();

    res.status(200).json({
      msg: `Application ${applicationId} marked as passed successfully`,
      progression: user.progression,
    });
  } catch (err) {
    console.error("Admin mark step passed error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};



