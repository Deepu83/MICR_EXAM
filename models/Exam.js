import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    examSubject: {
      type: String,
      required: true,
      trim: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    registrationStartDate: {
      type: Date,
      required: true,
    },
    registrationEndDate: {
      type: Date,
      required: true,
    },
    disclaimer: {
      type: String,
      default: "",
    },
    registrationAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    candidateDeclaration: {
      type: String,
      required: true,
    },

  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
