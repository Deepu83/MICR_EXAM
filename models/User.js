

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
  certificate: { type: FileSchema },
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




// ✅ Reusable Paper Schema
const PaperSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["in_progress", "passed", "failed","closed","open","filled"],
    default: "closed",
  },
  completedDate: { type: Date, default: null },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
});

// ✅ STEP-1 Schema (multiple papers)
const Step1Schema = new mongoose.Schema({
  papers: {
    paper1: {
      status: {
        type: String,
        enum: ["open","submitted", "passed", "failed","absent","closed","filled"],
        default: "closed",
      },
      completedDate: { type: Date, default: null },
      // applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
      applicationId: { type: String, default: null },
    },
    paper2: {
      status: {
        type: String,
        enum: ["open","submitted", "filled", "passed", "failed","absent","closed"],
        default: "closed",
      },
      completedDate: { type: Date, default: null },
      applicationId: { type: String, default: null },
    },
  },
  overallStatus: {
    type: String,
    enum: ["open", "filled","submitted",  "passed", "failed","absent","closed","in-progress"],
    default: "closed",
  },
  applicationId: { type: String, default: null },
  completedDate: { type: Date, default: null },
  allPapersPassed: { type: Boolean, default: false },
});


// ✅ STEP-2 Schema
const Step2Schema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["open", "filled","submitted",  "passed", "failed","absent","closed"],
    default: "closed",
  },
  completedDate: { type: Date, default: null },
  // applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
  applicationId: { type: String, default: null },
});

// ✅ STEP-3 Schema (Part A & Part B)
const Step3PartSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["open", "filled","submitted",  "passed", "failed","absent","closed"],
    default: "closed",
  },
  completedDate: { type: Date, default: null },
  // applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
  applicationId: { type: String, default: null },
});

const Step3Schema = new mongoose.Schema({
  partA: { type: Step3PartSchema, default: () => ({}) },
  partB: { type: Step3PartSchema, default: () => ({}) },
    overallStatus: {
    type: String,
    enum: ["open", "filled", "submitted", "passed", "failed","absent","closed","in-progress"],
    default: "closed",
  },
  applicationId: { type: String, default: null },
  completedDate: { type: Date, default: null },
});


// ✅ Main Progression Schema (Fixed)
const ProgressionSchema = new mongoose.Schema({
  currentLevel: {
    type: mongoose.Schema.Types.Mixed, // allows both numbers and strings
    enum: [0, 1, 2, 3, 4, "1A", "1B"], // 1A and 1B for partial Step 1 completion
    default: 0,
  },
  step1: { type: Step1Schema, default: () => ({}) },
  step2: { type: Step2Schema, default: () => ({}) },
  step3: { type: Step3Schema, default: () => ({}) },
  allStepsCompleted: { type: Boolean, default: false },
  completionDate: { type: Date, default: null },
});

// ✅ User Schema

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
  progression: { type: ProgressionSchema, default: () => ({}) }, 
  createdAt: { type: Date, default: Date.now },
});



//new schema 



export default mongoose.model("User", UserSchema);
