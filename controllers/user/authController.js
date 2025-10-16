
// import User from "../../models/User.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import fs from "fs";
// import path from "path";
// import { generateRegisterNo } from "../../utils/generateRegisterNo.js";
import cloudinary from "../../config/cloudinary.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config(); // Make sure env variables are loaded at the very top
// import { sendSMS } from "../../utils/sendWhatsApp.js"; // import our utility
import { sendWhatsApp } from "../../utils/sendWhatsApp.js";
import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { generateRegisterNo } from "../../utils/generateRegisterNo.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import { CURSOR_FLAGS } from "mongodb";


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
      registerNo: user.registerNo,
      progression: user.progression || {},
      profileCompleted: user.profileCompleted,
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
    console.log("🟡 Raw request body:", req.body);

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

    // Ensure profile exists
    user.profile = user.profile || {};
    user.profile.application = user.profile.application || {};
    user.profile.education = user.profile.education || {};
    user.profile.documents = user.profile.documents || {};

    // Initialize documents
    const uploadedDocuments = { ...user.profile.documents };

    // Upload files if present
    if (req.files && Object.keys(req.files).length > 0) {
      const folderMap = {
        photo: "users/photo",
        signature: "users/signature",
        id_proof: "users/identity",
        education: "users/education",
        address: "users/address",
        registrationCertificate: "users/registrationCertificate",
        mbbsCertificate: "users/mbbs",
        pgCertificate: "users/pg",
      };

      for (const key in req.files) {
        if (req.files[key].length > 0) {
          const file = req.files[key][0];
          const filePath = path.resolve(file.path);

          const upload = await cloudinary.uploader.upload(filePath, {
            folder: folderMap[key] || "users",
          });

          const fileData = {
            url: upload.secure_url,
            public_id: upload.public_id,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            lastModified: new Date(),
          };

          // Map uploaded file to the correct schema path
          if (key === "mbbsCertificate") {
            user.profile.education.mbbs = user.profile.education.mbbs || {};
            user.profile.education.mbbs.certificate = fileData;
            user.markModified("profile.education.mbbs.certificate");
          } else if (key === "pgCertificate") {
            user.profile.education.pg = user.profile.education.pg || {};
            user.profile.education.pg.certificate = fileData;
            user.markModified("profile.education.pg.certificate");
          } else if (key === "registrationCertificate") {
            user.profile.application.registrationCertificate = fileData;
            user.markModified("profile.application.registrationCertificate");
          } else {
            uploadedDocuments[key] = fileData;
          }

          fs.unlinkSync(filePath); // remove temp file
        }
      }
    }

    // Merge new data
//     // Merge MBBS
// user.profile.education.mbbs = {
//   ...(user.profile.education.mbbs || {}),
//   ...(education.mbbs || {}),
// };

// // Merge PG
// user.profile.education.pg = {
//   ...(user.profile.education.pg || {}),
//   ...(education.pg || {}),
// };
//     user.profile.application = { ...user.profile.application, ...application };
//     user.profile.education = { ...user.profile.education, ...education };
//     user.profile.documents = uploadedDocuments;
//     user.profile.profileCompletedAt = new Date();
//     user.profileCompleted = true;



user.profile.application = {
  ...user.profile.application,
  ...application,
};

// Preserve MBBS & PG certificates
user.profile.education = {
  ...user.profile.education,
  mbbs: {
    ...user.profile.education.mbbs,
    ...education.mbbs,
    certificate:
      user.profile.education.mbbs?.certificate ||
      education.mbbs?.certificate ||
      null,
  },
  pg: {
    ...user.profile.education.pg,
    ...education.pg,
    certificate:
      user.profile.education.pg?.certificate ||
      education.pg?.certificate ||
      null,
  },
  others:
    education.others ||
    user.profile.education.others ||
    [],
};

user.profile.documents = uploadedDocuments;
user.profile.profileCompletedAt = new Date();
user.profileCompleted = true;

    // --- PROGRESSION LOGIC ---
    user.progression = user.progression || {};
    user.progression.step1 = user.progression.step1 || {};
    user.progression.step1.papers = user.progression.step1.papers || {};

    if (!user.progression.step1.papers.paper1?.status || user.progression.step1.papers.paper1.status !== "passed") {
      user.progression.step1.papers.paper1 = { ...user.progression.step1.papers.paper1, status: "open" };
    }
    if (!user.progression.step1.papers.paper2?.status || user.progression.step1.papers.paper2.status !== "passed") {
      user.progression.step1.papers.paper2 = { ...user.progression.step1.papers.paper2, status: "open" };
    }

    user.progression.step1.overallStatus = "open";
    user.progression.step1.completedDate = null;
    user.progression.step1.allPapersPassed = false;

    user.progression.step2 = user.progression.step2 || {};
    user.progression.step3 = user.progression.step3 || {};
    user.progression.currentLevel = 1;

    await user.save();

    res.status(200).json({
      msg: "Profile updated successfully",
      profile: user.profile,
      progression: user.progression,
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

// GET user by ID Admin pannel Api 
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({
      msg: "User fetched successfully",
      user,
      centers: user.profile?.application?.centers || {}
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
    const { userId, applicationId, status } = req.body;

    if (!userId) {
      return res.status(400).json({ msg: "userId is required" });
    }

    if (!applicationId) {
      return res.status(400).json({ msg: "applicationId is required" });
    }

    if (!status || !["passed", "failed", "absent"].includes(status)) {
      return res.status(400).json({ msg: "Status must be 'passed', 'failed' or 'absent'" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Find the exam registration by applicationNumber
    const aplDoc = await ExamRegistration.findOne({ applicationNumber: applicationId });
    if (!aplDoc) return res.status(404).json({ msg: "Application not found" });

    // Update ExamRegistration
    aplDoc.applicationInfo.applicationStatus = status;
    await aplDoc.save();

    const now = new Date();
    if (!user.progression) user.progression = {};

    let found = false;

    // Helper to update paper status
    const updatePaper = (paper = {}) => {
      if (paper.applicationId === applicationId) {
        found = true;
        return { ...paper, status, completedDate: now, applicationId: paper.applicationId };
      }
      return paper;
    };




    // Step 1
    if (!user.progression.step1) user.progression.step1 = {};
    if (!user.progression.step1.papers) user.progression.step1.papers = {};
    user.progression.step1.papers.paper1 = updatePaper(user.progression.step1.papers.paper1 || {});
    user.progression.step1.papers.paper2 = updatePaper(user.progression.step1.papers.paper2 || {});
    if (
      user.progression.step1.papers.paper1.status === status ||
      user.progression.step1.papers.paper2.status === status
    ) {
      user.progression.step1.status = status;
      user.progression.step1.completedDate = now;
      user.progression.step1.overallStatus = status;
      user.progression.step1.allPapersPassed = true;
      user.progression.step2.status = open;
      
    }

    // Step 2
    if (!user.progression.step2) user.progression.step2 = {};
    if (user.progression.step2.papers) {
      for (const key in user.progression.step2.papers) {
        user.progression.step2.papers[key] = updatePaper(user.progression.step2.papers[key]);
      }
      if (Object.values(user.progression.step2.papers).some(p => p.status === status)) {
        user.progression.step2.status = status;
        user.progression.step2.completedDate = now;
        user.progression.step2.overallStatus = status;
      }
    }
    if (user.progression.step2.applicationId === applicationId) {
      user.progression.step2.status = status;
      user.progression.step2.completedDate = now;
      user.progression.step2.overallStatus = status;
      found = true;
      user.progression.step3.status = open;
    }

    // Step 3
    if (!user.progression.step3) user.progression.step3 = {};
    if (!user.progression.step3.partA) user.progression.step3.partA = {};
    if (!user.progression.step3.partB) user.progression.step3.partB = {};

    user.progression.step3.partA = updatePaper(user.progression.step3.partA);
    user.progression.step3.partB = updatePaper(user.progression.step3.partB);

    if (!found) {
      return res.status(404).json({ msg: "ApplicationId not exist in user progression" });
    }

    // Update currentLevel only if passed
    if (user.progression.step1.status === "passed") user.progression.currentLevel = 2;
    if (user.progression.step2.status === "passed") user.progression.currentLevel = 3;

    // Check if all steps completed (only for passed)
    const allStepsPassed =
      user.progression.step1?.status === "passed" &&
      user.progression.step2?.status === "passed" &&
      user.progression.step3.partA?.status === "passed" &&
      user.progression.step3.partB?.status === "passed";

    if (allStepsPassed) {
      user.progression.currentLevel = 4;
      user.progression.allStepsCompleted = true;
      user.progression.completionDate = now;
    }

    await user.save();

    res.status(200).json({
      msg: `Application ${applicationId} marked as ${status} successfully`,
      progression: user.progression,
    });
  } catch (err) {
    console.error("Admin mark step status error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
