// models/User.js
import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  fullName: { type: String },
  dob: { type: Date },
  phone: { type: String },
  address: { type: String },
  chosenStream: { type: String }, // e.g., "Science", "Commerce"
  registrationImageUrl: { type: String },
  liveImageUrl: { type: String },
  registrationImageVerified: { type: Boolean, default: false },
  liveImageVerified: { type: Boolean, default: false },
  fingerVerified: { type: String }, // e.g., "Right Thumb"
  profileCompletedAt: { type: Date }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  profile: ProfileSchema,
  profileCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
