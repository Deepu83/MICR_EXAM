import User from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
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

    const user = await User.create({ email, passwordHash });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    res.status(201).json({
      token,
      userId: user._id,
      email: user.email,
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
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params; // user id from route param
    const {
      fullName,
      dob,
      phone,
      address,
      chosenStream,
      registrationImageUrl,
      liveImageUrl,
      registrationImageVerified,
      liveImageVerified,
      fingerVerified,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Merge/update profile fields
    user.profile = {
      ...(user.profile ? user.profile.toObject() : {}), // avoid undefined
      fullName: fullName ?? user.profile?.fullName,
      dob: dob ?? user.profile?.dob,
      phone: phone ?? user.profile?.phone,
      address: address ?? user.profile?.address,
      chosenStream: chosenStream ?? user.profile?.chosenStream,
      registrationImageUrl:
        registrationImageUrl ?? user.profile?.registrationImageUrl,
      liveImageUrl: liveImageUrl ?? user.profile?.liveImageUrl,
      registrationImageVerified:
        registrationImageVerified ?? user.profile?.registrationImageVerified,
      liveImageVerified: liveImageVerified ?? user.profile?.liveImageVerified,
      fingerVerified: fingerVerified ?? user.profile?.fingerVerified,
      profileCompletedAt: new Date(),
    };

    // Mark profile as completed
    user.profileCompleted = true;

    await user.save();

    res
      .status(200)
      .json({ msg: "Profile updated successfully", profile: user.profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
