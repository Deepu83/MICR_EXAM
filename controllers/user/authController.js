import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

// Update user profile
// ========== UPDATE PROFILE ==========
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params; // user id from route param
    const { personal_details, education_details, documents } = req.body;
console.log(req.body)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Upload files to Cloudinary if provided (documents)
    const uploadedDocuments = { ...documents };

    if (req.files) {
      if (req.files.passport_size_photograph) {
        const upload = await cloudinary.uploader.upload(
          req.files.passport_size_photograph[0].path,
          { folder: "users/passport" }
        );
        uploadedDocuments.passport_size_photograph = {
          ...(documents?.passport_size_photograph || {}),
          file: upload.secure_url,
        };
      }

      if (req.files.signature) {
        const upload = await cloudinary.uploader.upload(
          req.files.signature[0].path,
          { folder: "users/signature" }
        );
        uploadedDocuments.signature = {
          ...(documents?.signature || {}),
          file: upload.secure_url,
        };
      }

      if (req.files.identity_proof) {
        const upload = await cloudinary.uploader.upload(
          req.files.identity_proof[0].path,
          { folder: "users/identity" }
        );
        uploadedDocuments.identity_proof = {
          ...(documents?.identity_proof || {}),
          file: upload.secure_url,
        };
      }

      if (req.files.education_certificate) {
        const upload = await cloudinary.uploader.upload(
          req.files.education_certificate[0].path,
          { folder: "users/education" }
        );
        uploadedDocuments.education_certificate = {
          ...(documents?.education_certificate || {}),
          file: upload.secure_url,
        };
      }

      if (req.files.address_proof) {
        const upload = await cloudinary.uploader.upload(
          req.files.address_proof[0].path,
          { folder: "users/address" }
        );
        uploadedDocuments.address_proof = {
          ...(documents?.address_proof || {}),
          file: upload.secure_url,
        };
      }
    }

    // Merge/update nested profile fields
    user.profile = {
      ...(user.profile ? user.profile.toObject() : {}),
      personal_details: {
        ...(user.profile?.personal_details || {}),
        ...personal_details,
      },
      education_details: {
        ...(user.profile?.education_details || {}),
        ...education_details,
      },
      documents: uploadedDocuments,
      profileCompletedAt: new Date(),
    };

    // Mark profile as completed
    user.profileCompleted = true;

    await user.save();

    res.status(200).json({
      msg: "Profile updated successfully",
      profile: user.profile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};



