
import cloudinary from "../../config/cloudinary.js";
import fs from "fs";
import path from "path";
// import dotenv from "dotenv";
// import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
// dotenv.config(); // Make sure env variables are loaded at the very top

import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Exam from "../../models/Exam.js"

import { generateRegisterNo } from "../../utils/generateRegisterNo.js";
import ExamRegistration from "../../models/ExamRegistration.js";


const JWT_SECRET =
  process.env.JWT_SECRET ||
  "860bafe47a1d1e7e81a54e72a7aa9d35721517fc2d259f61df9c0a8441a1e5f75343d33c70042ba2d6154f5cbb239f741fd7e2916dfbde87901ae9522cbbb78a";
const JWT_EXPIRES = "1d";

// ✅ Configure Nodemailer transporter using Gmail
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kandpaldeepak253@gmail.com",
    pass: "ytpl sqpy fokh ldck", // your Gmail App Password
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




// Create transporter directly (no env vars)

// export const sendProfileUpdateOTP = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // ✅ Validate user
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     // ✅ Generate random 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000);

//     // ✅ Save OTP and expiry (5 min)
//     user.otp = otp;
//     user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
//     await user.save();

//     // ✅ Respond immediately
//     res.status(200).json({ msg: "OTP generated successfully" });

//     // ✅ Send email in background
//     const mailOptions = {
//       from: `"Cognoscente Invented Pvt. Ltd." <kandpaldeepak253@gmail.com>`,
//       to: user.email,
//       subject: "OTP Verification for Profile Update 🔐",
//       html: `
//         <p>Dear ${user.name},</p>
//         <p>Your One-Time Password (OTP) for updating your profile is:</p>
//         <h2>${otp}</h2>
//         <p>This OTP is valid for 5 minutes.</p>
//         <p>Best regards,<br/>Cognoscente Invented Pvt. Ltd. Team</p>
//       `,
//     };

//     transporter.sendMail(mailOptions)
//       .then(() => console.log("✅ OTP email sent to", user.email))
//       .catch(err => console.error("❌ Email send error:", err));
//   } catch (err) {
//     console.error("OTP send error:", err);
//     res.status(500).json({ msg: "Failed to generate OTP", error: err.message });
//   }
// };

import sgMail from "@sendgrid/mail";


dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendProfileUpdateOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    // ✅ Correct SendGrid message format
    const msg = {
      to: user.email,
      from: {
        email: process.env.EMAIL_FROM, // email FIRST
        name: "Cognoscente Invented Pvt. Ltd.",
      },
      subject: "OTP Verification for Profile Update 🔐",
      html: `
        <p>Dear ${user.name},</p>
        <p>Your One-Time Password (OTP) for updating your profile is:</p>
        <h2 style="color:#2E86C1;">${otp}</h2>
        <p>This OTP is valid for <strong>5 minutes</strong>.</p>
        <p>Best regards,<br/>Cognoscente Invented Pvt. Ltd. Team</p>
      `,
    };

    // ✅ Send email
    await sgMail.send(msg);
    console.log("✅ OTP email sent to", user.email);

    return res.status(200).json({
      msg: "OTP sent successfully",
      email: user.email,
    });
  } catch (err) {
    console.error("❌ OTP send error:", err.response?.body || err.message);
    return res.status(500).json({
      msg: "Failed to send OTP",
      error: err.response?.body?.errors?.[0]?.message || err.message,
    });
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
export const adminMarkStepPassed = async (req, res) => {
  try {
    const { userId, applicationId, status } = req.body;

    if (!userId) return res.status(400).json({ msg: "userId is required" });
    if (!applicationId) return res.status(400).json({ msg: "applicationId is required" });
    if (!["passed", "failed", "absent"].includes(status))
      return res.status(400).json({ msg: "Status must be 'passed', 'failed', or 'absent'" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const aplDoc = await ExamRegistration.findOne({ userId, applicationNumber: applicationId });

    const isOverallStep1 = user.progression?.step1?.applicationId === applicationId;
    const isOverallStep3 = user.progression?.step3?.applicationId === applicationId;

    if (!aplDoc && !isOverallStep1 && !isOverallStep3)
      return res.status(404).json({ msg: "Application ID not found for this user" });

    // ✅ Update application document
    if (aplDoc) {
      aplDoc.applicationInfo.applicationStatus = status;
      await aplDoc.save();
    }

    // ✅ Initialize progression safely
    if (!user.progression) user.progression = {};
    const { step1 = {}, step2 = {}, step3 = {} } = user.progression;
    if (!step1.papers) step1.papers = {};
    if (!step3.partA) step3.partA = {};
    if (!step3.partB) step3.partB = {};

    const now = new Date();
    const updatePaper = (paper = {}) => {
      if (paper.applicationId === applicationId) {
        paper.status = status;
        paper.completedDate = now;
      }
      return paper;
    };

    // ---------- STEP 1 ----------
    if (isOverallStep1) {
      for (const key of ["paper1", "paper2"]) {
        if (!step1.papers[key]) step1.papers[key] = {};
        step1.papers[key].status = status;
        step1.papers[key].completedDate = now;
      }
      step1.overallStatus = status;
      step1.completedDate = now;
    } else {
      step1.papers.paper1 = updatePaper(step1.papers.paper1);
      step1.papers.paper2 = updatePaper(step1.papers.paper2);
    }

    const p1 = step1.papers.paper1?.status;
    const p2 = step1.papers.paper2?.status;

    if (p1 === "passed" && p2 === "passed") {
      step1.overallStatus = "passed";
       step1.allPapersPassed = true;  //
      step1.completedDate = now;
      if (step2.status !== "passed") step2.status = "open";
    } else if (p1 === "failed" || p2 === "failed") {
      step1.overallStatus = "failed";
      step2.status = "closed";
    }

    // ---------- STEP 2 ----------
    if (step2.applicationId === applicationId) {
      step2.status = status;
      step2.overallStatus = status;
      step2.completedDate = now;

      if (status === "passed") {
        // step3.partA.status = step3.partA.status || "open";
        step3.partA.status = "open";
        step3.partB.status = step3.partB.status || "open";
        
      } else if (status === "failed") {
        step3.partA.status = "closed";
        step3.partB.status = "closed";
      }
    }
    if (step3.partA.applicationId === applicationId) {
  // Part A status update
  step3.partA.status = status;
  step3.partA.completedDate = now;

  if (status === "passed") {
    // If A passed → open B
    step3.partB.status = step3.partB.status === "closed" ? "open" : step3.partB.status;
    step3.overallStatus = "open";
  } else if (status === "failed") {
    step3.partA.status = "failed";
    step3.partB.status = "closed";
    step3.overallStatus = "failed";
  }
}


//step 3

// ---------- STEP 3 (Part A) ----------
if (step3.partA.applicationId === applicationId) {
  step3.partA.status = status;
  step3.partA.completedDate = now;

  if (status === "passed") {
    // If A passed → open B
    if (step3.partB.status === "closed") step3.partB.status = "open";
    step3.overallStatus = "open";
  } else if (status === "failed") {
    step3.partB.status = "closed";
    step3.overallStatus = "failed";
  }
}

// ---------- STEP 3 (Part B) ----------
if (step3.partB.applicationId === applicationId) {
  step3.partB.status = status;
  step3.partB.completedDate = now;

  if (status === "passed") {
    if (step3.partA.status === "passed") {
      // ✅ Both A & B passed → Step 3 complete
      step3.overallStatus = "passed";
      step3.completedDate = now;
    } else {
      step3.overallStatus = "open";
    }
  } else if (status === "failed") {
    step3.overallStatus = "failed";
  }
}

    
// ---------- CURRENT LEVEL LOGIC ----------

const paperA = step1?.papers?.paper1?.status || null;
const paperB = step1?.papers?.paper2?.status || null;
const partA = step3?.partA?.status || null;
const partB = step3?.partB?.status || null;

let currentLevel = 1;

// 🧩 Handle Step 1 progression first
if (paperA === "passed" && paperB !== "passed") {
  currentLevel = "1B"; // Paper1 passed → show 1B next
} else if (paperB === "passed" && paperA !== "passed") {
  currentLevel = "1A"; // Paper2 passed → show 1A next
} else if (paperA === "passed" && paperB === "passed") {
  step1.overallStatus = "passed";
  currentLevel = 2; // Both done → move to Step 2
}

// 🧩 Step 2 and Step 3 logic
if (step1.overallStatus === "passed" && step2.status === "passed") {
  // ✅ Check both passed first — priority highest
  if (partA === "passed" && partB === "passed") {
    currentLevel = 4;
    step3.overallStatus = "passed";
    step3.completedDate = now;
  } else if (partA === "passed" && partB !== "passed") {
    currentLevel = "3B";
  } else if (partB === "passed" && partA !== "passed") {
    currentLevel = "3A";
  } else {
    currentLevel = 3; // still in progress
  }
}
// ---------- ALL STEPS COMPLETED ----------
const allStepsCompleted =
  step1.overallStatus === "passed" &&
  step2.status === "passed" &&
  step3.overallStatus === "passed";

user.progression.allStepsCompleted = allStepsCompleted;
user.progression.completionDate = allStepsCompleted ? now : null;

// ✅ Save progression
user.progression.step1 = step1;
user.progression.step2 = step2;
user.progression.step3 = step3;
user.progression.currentLevel = currentLevel;


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

//get api for admin dashboard

// assuming you’ve got a ProfileEdit model or field for edit requests

export const getDashboardStats = async (req, res) => {
  try {
    // grab all the counts
    const totalExams = await Exam.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalRegistrations = await ExamRegistration.countDocuments();

    // if you’ve got a separate model or field for edit requests
    const totalEditRequests = await User.countDocuments({
      "profileEditRequest.status": "pending", // adjust to your field name
    });

    // grab all exams too if you wanna list them
    const exams = await Exam.find();

    res.status(200).json({
      message: "Dashboard stats fetched successfully ✅",
      data: {
        totalExams,
        totalUsers,
        totalRegistrations,
        totalEditRequests,
        exams,
      },
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



//passs exam with registration id 

// export const updateExamStatusByRegisterNo = async (req, res) => {
//   try {
//     const { registerNo, step, status, paper, part } = req.body;

//     const user = await User.findOne({ registerNo });
//     if (!user) {
//       return res.status(404).json({ msg: "User not found for given register number" });
//     }

//     // ensure progression object exists
//     if (!user.progression) user.progression = {};
//     const now = new Date();

//     // ---------- STEP 1 ----------
//     if (step === "step1") {
//       user.progression.step1 = user.progression.step1 || { papers: {} };

//       // ✅ Paper1 or Paper2 passed individually
//       if (paper === "paper1" || paper === "paper2") {
//         user.progression.step1.papers[paper] =
//           user.progression.step1.papers[paper] || {};
//         user.progression.step1.papers[paper].status = status;
//         user.progression.step1.papers[paper].completedDate = now;
//       }

//       // ✅ Check if both papers passed
//       const p1 = user.progression.step1.papers.paper1?.status === "passed";
//       const p2 = user.progression.step1.papers.paper2?.status === "passed";
//       if (p1 && p2) {
//         user.progression.step1.overallStatus = "passed";
//         user.progression.step1.completedDate = now;

//         // Automatically open Step 2
//         user.progression.step2 = user.progression.step2 || {};
//         user.progression.step2.status = "open";
//       }
//     }

//     // ---------- STEP 2 ----------
//     else if (step === "step2") {
//       user.progression.step2 = user.progression.step2 || {};
//       user.progression.step2.status = status;
//       user.progression.step2.completedDate = now;

//       if (status === "passed") {
//         // Automatically open Step 3 (Part A & B)
//         user.progression.step3 = user.progression.step3 || {};
//         user.progression.step3.partA = user.progression.step3.partA || {};
//         user.progression.step3.partB = user.progression.step3.partB || {};
//         user.progression.step3.partA.status = "open";
//         user.progression.step3.partB.status="closed"
//       }
//     }

//     // ---------- STEP 3 ----------
// // ---------- STEP 3 ----------
// else if (step === "step3") {
//   user.progression.step3 = user.progression.step3 || {};
//   user.progression.step3.partA = user.progression.step3.partA || {};
//   user.progression.step3.partB = user.progression.step3.partB || {};

//   // ✅ Update the current part (A or B)
//   if (part === "partA" || part === "partB") {
//     user.progression.step3[part].status = status;
//     user.progression.step3[part].completedDate = now;
//   }

//   // ✅ If Part A passed → open Part B automatically
//   if (part === "partA" && status === "passed") {
//     user.progression.step3.partB.status = "open";
//   }

//   // ✅ If both parts are passed → mark Step 3 complete
//   const aPassed = user.progression.step3.partA?.status === "passed";
//   const bPassed = user.progression.step3.partB?.status === "passed";

//   if (aPassed && bPassed) {
//     user.progression.step3.allStepsCompleted = true;
//     user.progression.step3.completionDate = now;
//   }
// }


//     // ✅ Save changes
//     await user.save();

//     res.status(200).json({
//       msg: `✅ ${step}${paper ? " - " + paper : part ? " - " + part : ""} marked as ${status} for ${registerNo}`,
//       user,
//     });
//   } catch (error) {
//     console.error("Error updating exam status:", error);
//     res.status(500).json({ msg: "Internal server error" });
//   }
// };
export const updateExamStatusByRegisterNo = async (req, res) => {
  try {
    const { registerNo, step, status, paper, part } = req.body;

    const user = await User.findOne({ registerNo });
    if (!user) {
      return res.status(404).json({ msg: "User not found for given register number" });
    }

    // ensure progression object exists
    if (!user.progression) user.progression = {};
    const now = new Date();

    // ---------- STEP 1 ----------
    if (step === "step1") {
      user.progression.step1 = user.progression.step1 || { papers: {} };

      // ✅ Paper1 or Paper2 passed individually
      if (paper === "paper1" || paper === "paper2") {
        user.progression.step1.papers[paper] =
          user.progression.step1.papers[paper] || {};
        user.progression.step1.papers[paper].status = status;
        user.progression.step1.papers[paper].completedDate = now;
      }

      // ✅ Check if both papers passed
      const p1 = user.progression.step1.papers.paper1?.status === "passed";
      const p2 = user.progression.step1.papers.paper2?.status === "passed";

      if (p1 && p2) {
        user.progression.step1.overallStatus = "passed";
        user.progression.step1.completedDate = now;

        // Automatically open Step 2
        user.progression.step2 = user.progression.step2 || {};
        user.progression.step2.status = "open";
      }
    }

    // ---------- STEP 2 ----------
    else if (step === "step2") {
      user.progression.step2 = user.progression.step2 || {};
      user.progression.step2.status = status;
      user.progression.step2.completedDate = now;

      if (status === "passed") {
        // Automatically open Step 3 (Part A & B)
        user.progression.step3 = user.progression.step3 || {};
        user.progression.step3.partA = user.progression.step3.partA || {};
        user.progression.step3.partB = user.progression.step3.partB || {};

        user.progression.step3.partA.status = "open";
        user.progression.step3.partB.status = "closed";
      }
    }

    // ---------- STEP 3 ----------
    else if (step === "step3") {
      user.progression.step3 = user.progression.step3 || {};
      user.progression.step3.partA = user.progression.step3.partA || {};
      user.progression.step3.partB = user.progression.step3.partB || {};

      // ✅ Update the current part (A or B)
      if (part === "partA" || part === "partB") {
        user.progression.step3[part].status = status;
        user.progression.step3[part].completedDate = now;
      }

      // ✅ If Part A passed → open Part B automatically
      if (part === "partA" && status === "passed") {
        user.progression.step3.partB.status = "open";
      }

      // ✅ If both parts are passed → mark Step 3 complete
      const aPassed = user.progression.step3.partA?.status === "passed";
      const bPassed = user.progression.step3.partB?.status === "passed";

      if (aPassed && bPassed) {
        user.progression.step3.overallStatus = "passed";
        user.progression.step3.allStepsCompleted = true;
        user.progression.step3.completionDate = now;
      }
    }

    // ======================================================
    // ---------- CURRENT LEVEL LOGIC ----------
    // ======================================================
    const { step1 = {}, step2 = {}, step3 = {} } = user.progression;

    const paperA = step1?.papers?.paper1?.status || null;
    const paperB = step1?.papers?.paper2?.status || null;
    const partA = step3?.partA?.status || null;
    const partB = step3?.partB?.status || null;

    let currentLevel = 1;

    // 🧩 Step 1 logic
    if (paperA === "passed" && paperB !== "passed") {
      currentLevel = "1B"; // Paper1 passed → show 1B next
    } else if (paperB === "passed" && paperA !== "passed") {
      currentLevel = "1A"; // Paper2 passed → show 1A next
    } else if (paperA === "passed" && paperB === "passed") {
      step1.overallStatus = "passed";
      currentLevel = 2; // Both done → move to Step 2
    }

    // 🧩 Step 2 and Step 3 logic
    if (step1.overallStatus === "passed" && step2.status === "passed") {
      if (partA === "passed" && partB === "passed") {
        currentLevel = 4;
        step3.overallStatus = "passed";
        step3.completedDate = now;
      } else if (partA === "passed" && partB !== "passed") {
        currentLevel = "3B";
      } else if (partB === "passed" && partA !== "passed") {
        currentLevel = "3A";
      } else {
        currentLevel = 3; // still in progress
      }
    }

    // ---------- ALL STEPS COMPLETED ----------
    const allStepsCompleted =
      step1.overallStatus === "passed" &&
      step2.status === "passed" &&
      step3.overallStatus === "passed";

    user.progression.allStepsCompleted = allStepsCompleted;
    user.progression.completionDate = allStepsCompleted ? now : null;
    user.progression.currentLevel = currentLevel;

    // ✅ Save all changes
    await user.save();

    res.status(200).json({
      msg: `✅ ${step}${paper ? " - " + paper : part ? " - " + part : ""} marked as ${status} for ${registerNo}`,
      currentLevel,
      progression: user.progression,
    });
  } catch (error) {
    console.error("❌ Error updating exam status:", error);
    res.status(500).json({ msg: "Internal server error", error: error.message });
  }
};
