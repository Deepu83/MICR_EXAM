

import mongoose from "mongoose";

// For uploaded files (photo, signature, certificates, etc.)
const FileSchema = new mongoose.Schema({
  name: { type: String },
  type: { type: String },
  size: { type: Number },
    url: String,
  lastModified: { type: Date },
});

// Education details structure
const EducationDetailSchema = new mongoose.Schema({
  year: { type: String },
  month: { type: String },
  college: { type: String },
  university: { type: String },
  place: { type: String },
  regNo: { type: String },
  // certificate: { type: FileSchema },
    certificates: [FileSchema],
});

// Personal details structure
const PersonalDetailsSchema = new mongoose.Schema({
  fullName: { type: String },
  fatherName: { type: String },
  dob: { type: Date },
  gender: { type: String },
  maritalStatus: { type: String },
  nationality: { type: String },
  presentStatus: { type: String },
  councilName: { type: String },
  iriaMembershipNumber: { type: String },
  registrationNumber: { type: String },
  email: { type: String },
  contactNumber: { type: String },
  altNumber: { type: String },
  centers: {
    center1: { type: String },
    center2: { type: String },
  },
  address: {
    house: { type: String },
    street: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  registrationCertificate: { type: FileSchema },
});

// Education section schema
const EducationSchema = new mongoose.Schema({
  mbbs: { type: EducationDetailSchema },
  pg: { type: EducationDetailSchema },
  others: [EducationDetailSchema],
  
});

// Documents section schema
const DocumentsSchema = new mongoose.Schema({
  address: { type: FileSchema },
  education: { type: FileSchema },
  id_proof: { type: FileSchema },
  photo: { type: FileSchema },
  signature: { type: FileSchema },
});

// Main User/Profile schema
const ProfileSchema = new mongoose.Schema(
  {
    application: { type: PersonalDetailsSchema },
    documents: { type: DocumentsSchema },
    education: { type: EducationSchema },
    profileCompletedAt: { type: Date },
  },
  { timestamps: true }
);

// export default mongoose.model("User", ProfileSchema);


const UserSchema = new mongoose.Schema({
    name: {
    type: String,
    required: true,
    trim: true,
  },
  aadhaarNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{12}$/, // Ensures exactly 12 digits
  },
  mobileNumber: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/, // Basic Indian mobile number validation
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },

  passwordHash: { type: String, required: true },
  profile: ProfileSchema,
  registerNo: {
    type: String,
    unique: true,
    uppercase: true,
  },
  profileCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", UserSchema);
