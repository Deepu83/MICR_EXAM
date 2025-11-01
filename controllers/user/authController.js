
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

    // ✅ Validate required fields
    if (!name || !aadhaarNumber || !mobileNumber || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // ✅ Validate email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Missing email credentials in .env");
      return res
        .status(500)
        .json({ msg: "Email credentials not configured on server" });
    }

    // ✅ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // ✅ Check if Aadhaar already exists
    const existingAadhaar = await User.findOne({ aadhaarNumber });
    if (existingAadhaar) {
      return res.status(400).json({ msg: "Aadhaar number already registered" });
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ✅ Generate sequential register number
    const registerNo = await generateRegisterNo();

    // ✅ Create new user
    const user = await User.create({
      name,
      aadhaarNumber,
      mobileNumber,
      email,
      passwordHash,
      
      registerNo,
    });

    // ✅ Generate JWT token
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

    // ✅ Send email asynchronously (Render-safe)
    Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email timeout")), 7000)
      ),
    ])
      .then((info) => console.log("📩 Email sent successfully:", info.response))
      .catch((emailError) =>
        console.error("⚠️ Email failed or timed out:", emailError.message)
      );

    // ✅ Send response immediately (don’t wait for email)
    return res.status(201).json({
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
    return res.status(500).json({ msg: "Server error", error: err.message });
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
//otp 
// ✅ Send OTP for profile update
export const sendProfileUpdateOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    //varify otp 
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Save OTP and expiry (5 min)
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // Prepare email
    const mailOptions = {
      from: `"Cognoscente Invented Pvt. Ltd." <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "OTP Verification for Profile Update 🔐",
      html: `
        <p>Dear ${user.name},</p>
        <p>Your One-Time Password (OTP) for updating your profile is:</p>
        <h2>${otp}</h2>
        <p>This OTP is valid for 5 minutes.</p>
        <p>Best regards,<br/>Cognoscente Invented Pvt. Ltd. Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ msg: "Failed to send OTP", error: err.message });
  }
};



export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
      const { otp } = req.body;

    // ✅ Step 1: Verify OTP before allowing update
    if (!otp) return res.status(400).json({ msg: "OTP is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ msg: "OTP expired or invalid" });
    }

    if (user.otp !== parseInt(otp)) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // ✅ OTP verified → clear it so it can’t be reused
    user.otp = null;
    user.otpExpires = null;

    //otp
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

    // const user = await User.findById(userId);
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

    if (!userId) return res.status(400).json({ msg: "userId is required" });
    if (!applicationId) return res.status(400).json({ msg: "applicationId is required" });
    if (!["passed", "failed", "absent"].includes(status))
      return res.status(400).json({ msg: "Status must be 'passed', 'failed' or 'absent'" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const now = new Date();
    let found = false;

    let aplDoc = await ExamRegistration.findOne({ applicationNumber: applicationId });

    const isOverallStep1 =
      user.progression?.step1?.applicationId &&
      user.progression.step1.applicationId === applicationId;

    const isOverallStep3 =
      user.progression?.step3?.applicationId &&
      user.progression.step3.applicationId === applicationId;

    if (!aplDoc && !isOverallStep1 && !isOverallStep3)
      return res.status(404).json({ msg: "Application not found" });

    if (aplDoc) {
      aplDoc.applicationInfo.applicationStatus = status;
      await aplDoc.save();
    }

    if (!user.progression) user.progression = {};
    if (!user.progression.step1) user.progression.step1 = {};
    if (!user.progression.step1.papers) user.progression.step1.papers = {};
    if (!user.progression.step2) user.progression.step2 = {};
    if (!user.progression.step3) user.progression.step3 = {};
    if (!user.progression.step3.partA) user.progression.step3.partA = {};
    if (!user.progression.step3.partB) user.progression.step3.partB = {};

    const { step1, step2, step3 } = user.progression;

    // ✅ Helper to update any paper/part safely
    const updatePaper = (paper = {}) => {
      if (paper.applicationId === applicationId) {
        found = true;
        paper.status = status;
        paper.completedDate = now;
      }
      return paper;
    };

    // ---------- STEP 1 ----------
    const papers = step1.papers;
    if (isOverallStep1) {
      found = true;
      for (const key of ["paper1", "paper2"]) {
        if (!papers[key]) papers[key] = {};
        papers[key].status = status;
        papers[key].completedDate = now;

        if (papers[key].applicationId) {
          await ExamRegistration.updateOne(
            { applicationNumber: papers[key].applicationId },
            { $set: { "applicationInfo.applicationStatus": status } }
          );
        }
      }

      step1.status = status;
      step1.overallStatus = status;
      step1.completedDate = now;
    } else {
      papers.paper1 = updatePaper(papers.paper1);
      papers.paper2 = updatePaper(papers.paper2);
    }

    const paper1Status = papers.paper1?.status;
    const paper2Status = papers.paper2?.status;

    // ---------- DYNAMIC LEVEL LOGIC ----------
    user.progression.currentLevel = 1; // default

    if (paper1Status === "passed" && paper2Status === "passed") {
      step1.status = "passed";
      step1.overallStatus = "passed";
      step1.completedDate = now;
      step2.status = "open";
      user.progression.currentLevel = 2;
    } else if (
      (paper1Status === "passed" && paper2Status !== "passed") ||
      (paper2Status === "passed" && paper1Status !== "passed")
    ) {
      step1.overallStatus = "in-progress";
      if (paper1Status === "passed") user.progression.currentLevel = "1A";
      if (paper2Status === "passed") user.progression.currentLevel = "1B";
    } else if (paper1Status === "failed" || paper2Status === "failed") {
      step1.overallStatus = "failed";
      user.progression.currentLevel = 1;
      step2.status = "closed";
    }

    // ---------- STEP 2 ----------
    // if (user.progression.step2.applicationId === applicationId) {
    //   found = true;
    //   step2.status = status;
    //   step2.overallStatus = status;
    //   step2.completedDate = now;

    //   if (status === "passed") {
    //     step3.partA = { status: "open" };
    //     step3.partB = { status: "open" };
    //     user.progression.currentLevel = 3;
    //   } else {
    //     step3.partA = { status: "closed" };
    //     step3.partB = { status: "closed" };
    //   }
    // }

    // // ---------- STEP 3 ----------
    // // ✅ If overall Step 3 application ID is used
    // if (isOverallStep3) {
    //   found = true;

    //   for (const part of ["partA", "partB"]) {
    //     if (!step3[part]) step3[part] = {};
    //     step3[part].status = status;
    //     step3[part].completedDate = now;

    //     if (step3[part].applicationId) {
    //       await ExamRegistration.updateOne(
    //         { applicationNumber: step3[part].applicationId },
    //         { $set: { "applicationInfo.applicationStatus": status } }
    //       );
    //     }
    //   }

    //   step3.overallStatus = status;
    //   step3.completedDate = now;
    // } else {
    //   step3.partA = updatePaper(step3.partA);
    //   step3.partB = updatePaper(step3.partB);
    // }

    // // ---------- FINAL COMPLETION ----------
    // const allStepsPassed =
    //   step1.overallStatus === "passed" &&
    //   step2.status === "passed" &&
    //   step3.partA?.status === "passed" &&
    //   step3.partB?.status === "passed";

    // if (allStepsPassed) {
    //   user.progression.currentLevel = 4;
    //   user.progression.allStepsCompleted = true;
    //   user.progression.completionDate = now;
    // } else {
    //   user.progression.allStepsCompleted = false;
    //   user.progression.completionDate = null;
    // }
    // ---------- STEP 2 ----------
if (user.progression.step2.applicationId === applicationId) {
  found = true;
  step2.status = status;
  step2.overallStatus = status;
  step2.completedDate = now;

  if (status === "passed") {
    // open step 3 only once
    if (!step3.partA?.status && !step3.partB?.status) {
      step3.partA = { status: "open" };
      step3.partB = { status: "open" };
    }
    user.progression.currentLevel = 3;
  } else {
    step3.partA = { status: "closed" };
    step3.partB = { status: "closed" };
  }
}

// ---------- STEP 3 ----------
if (isOverallStep3) {
  found = true;

  for (const part of ["partA", "partB"]) {
    if (!step3[part]) step3[part] = {};
    step3[part].status = status;
    step3[part].completedDate = now;

    if (step3[part].applicationId) {
      await ExamRegistration.updateOne(
        { applicationNumber: step3[part].applicationId },
        { $set: { "applicationInfo.applicationStatus": status } }
      );
    }
  }

  step3.overallStatus = status;
  step3.completedDate = now;
} else {
  step3.partA = updatePaper(step3.partA);
  step3.partB = updatePaper(step3.partB);
}
// ---------- FINAL COMPLETION ----------
const step1Passed = step1.overallStatus === "passed";
const step2Passed = step2.status === "passed";
const partAPassed = step3.partA?.status === "passed";
const partBPassed = step3.partB?.status === "passed";
const step3Passed =
  step3.overallStatus === "passed" ||
  (partAPassed && partBPassed);

const allStepsPassed = step1Passed && step2Passed && step3Passed;

if (allStepsPassed) {
  user.progression.currentLevel = 4;
  user.progression.allStepsCompleted = true;
  user.progression.completionDate = now;
} else {
  user.progression.allStepsCompleted = false;
  user.progression.completionDate = null;
}


    await user.save();

    res.status(200).json({
      msg: `Application ${applicationId} marked as ${status} successfully`,
      progression: user.progression,
    });
  } catch (err) {
    console.error("❌ Admin mark step status error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


//edit api
// User requests edit - stored for admin approval
export const requestProfileEdit = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.editApprovalStatus === "pending") {
      return res.status(400).json({ msg: "Edit already pending approval" });
    }

    // 🟢 If there are uploaded files, add file info to updates
    if (req.files) {
      updates.documents = updates.documents || {};

      for (const field in req.files) {
        const file = req.files[field][0];
        updates.documents[field] = {
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          url: `/uploads/tmp/${file.filename}`, // or move to permanent location
          lastModified: new Date(),
        };
      }
    }

    // Store pending update
    user.pendingProfileUpdate = updates;
    user.editApprovalStatus = "pending";
    await user.save();

    res.status(200).json({
      msg: "Profile edit request submitted. Waiting for admin approval.",
      pendingData: user.pendingProfileUpdate,
    });
  } catch (err) {
    console.error("Edit request error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export const approveProfileEdit = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // "approve" or "reject"

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.editApprovalStatus !== "pending") {
      return res.status(400).json({ msg: "No pending edits to approve" });
    }

    if (action === "approve") {
      // Replace current profile with pending one
      user.profile = {
        ...user.profile,
        ...user.pendingProfileUpdate,
      };
      user.editApprovalStatus = "approved";
      user.pendingProfileUpdate = null;
    } else if (action === "reject") {
      user.editApprovalStatus = "rejected";
      user.pendingProfileUpdate = null;
    } else {
      return res.status(400).json({ msg: "Invalid action" });
    }

    await user.save();

    res.status(200).json({
      msg: `Profile edit ${action}ed successfully`,
      profile: user.profile,
    });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


// Get all users who requested or have approved edits
export const getEditRequests = async (req, res) => {
  try {
    const users = await User.find({
      editApprovalStatus: { $in: ["pending", "approved"] },
    }).select("name email editApprovalStatus pendingProfileUpdate");

    if (users.length === 0) {
      return res.status(404).json({ msg: "No users found with edit requests or approvals" });
    }

    res.status(200).json({
      msg: "Fetched users with pending or approved edits",
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("Fetch edit requests error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
