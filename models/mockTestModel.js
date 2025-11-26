
import mongoose from "mongoose";

/* ----------------------------------------
   IMAGE SCHEMA (JPG, PNG, DICOM Supported)
-----------------------------------------*/
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },     // Cloudinary URL
  filename: { type: String },                // Cloudinary public_id
  mimeType: { type: String },                // image/jpeg, image/png, application/dicom
  size: { type: Number },                    // file size in bytes
  caption: { type: String },                 // Optional medical caption
  altText: { type: String },                 // Accessibility text
  type: {                                    // File category
    type: String,
    enum: ["jpg", "png", "dicom"],
    required: true
  },

  // Optional radiology hotspot marking (future AI mode)
  hotspotAnswers: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    label: String
  }]
});


/* ----------------------------------------
         QUESTION SCHEMA
-----------------------------------------*/
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },

  // OPTIONS for MCQ / objective
  options: {
    type: [String],
    required: function () {
      return ["objective", "true-false", "multiple-choice"].includes(this.type);
    },
    default: []
  },

  // SINGLE correct answer
  correctAnswer: {
    type: String,
    required: function () {
      return ["objective", "true-false", "Fill in the blanks"].includes(this.type);
    }
  },

  // MULTIPLE correct answers
  correctAnswers: {
    type: [String],
    required: function () {
      return this.type === "multiple-choice";
    },
    default: []
  },

  // QUESTION TYPE
  type: {
    type: String,
    enum: [
      "objective",
      "subjective",
      "multiple-choice",
      "true-false",
      "Fill in the blanks",
      "Coding",
      "Case Study",
      "Explanation-based",
      "Practical/Skill-Based",
      "image-based",
      "dicom-based"
    ],
    required: true
  },

  /* -------------------------------
       IMAGE BASED QUESTIONS
  --------------------------------*/
  images: [imageSchema],      // JPG / PNG images
  dicomFiles: [imageSchema],  // DICOM images also stored here (same structure)

  // marks for each question
  marks: { type: Number, default: 1 }
});


/* ----------------------------------------
             MOCK TEST SCHEMA
-----------------------------------------*/
const mockTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },

  questions: [questionSchema],

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("MockTest", mockTestSchema);
