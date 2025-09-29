// models/User.js
import mongoose from "mongoose";



const FileSchema = new mongoose.Schema({
  file: { type: String },
  max_size: { type: String },
  allowed_formats: [{ type: String }],
});

const EducationDetailSchema = new mongoose.Schema({
  year: { type: String },
  month: { type: String },
  college: { type: String },
  university: { type: String },
  place: { type: String },
  registration_number: { type: String },
  certificate_upload: { type: String },
  
});

const PersonalDetailsSchema = new mongoose.Schema({
  full_name: { type: String },
  father_name: { type: String },
  date_of_birth: { type: Date },
  gender: { type: String },
  marital_status: { type: String },
  nationality: { type: String },
  contact_number: { type: String },
  alternate_number: { type: String },
  email: { type: String },
  address: {
    house: { type: String },
    street: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    country: { type: String },
    zip_code: { type: String },
  },
  council_name: { type: String },
  registration_number: { type: String },
  registration_certificate: { type: String },
  iria_membership_number: { type: String },
  present_status: { type: String },
  select_center_1: { type: String },
  select_center_2: { type: String },
});

const EducationDetailsSchema = new mongoose.Schema({
  mbbs: { type: EducationDetailSchema },
  pg: { type: EducationDetailSchema },
  other_qualifications: [EducationDetailSchema],
});

const DocumentsSchema = new mongoose.Schema({
  passport_size_photograph: { type: FileSchema },
  signature: { type: FileSchema },
  identity_proof: { type: FileSchema },
  education_certificate: { type: FileSchema },
  address_proof: { type: FileSchema },
});

const ProfileSchema = new mongoose.Schema({
  personal_details: { type: PersonalDetailsSchema },
  education_details: { type: EducationDetailsSchema },
  documents: { type: DocumentsSchema },
  profileCompletedAt: { type: Date },
});

const UserSchema = new mongoose.Schema({
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
