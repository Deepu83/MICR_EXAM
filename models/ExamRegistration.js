import mongoose from "mongoose";

const ExamRegistrationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true, // e.g., "STEP1-2025-00020"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    applicationInfo: {
      applicationDate: { type: Date, default: Date.now },
      examDate: { type: Date, required: true },
      examCenter: { type: String, required: true },
      applicationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", "appeared", "cancelled"],
        default: "pending",
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "paid", "refunded"],
        default: "unpaid",
      },
      paymentDate: { type: Date, default: null },
      paymentAmount: { type: Number, required: true, min: 0 },
      remarks: { type: String, default: "" },
    },

    result: {
      marksObtained: { type: Number, default: null, min: 0 },
      percentage: { type: Number, default: null, min: 0, max: 100 },
      grade: { type: String, default: null },
      resultStatus: {
        type: String,
        enum: ["pending", "pass", "fail", "absent"],
        default: "pending",
      },
      examAttemptedDate: { type: Date, default: null },
      resultPublishedDate: { type: Date, default: null },
      resultPublishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminUser",
        default: null,
      },
      remarks: { type: String, default: "" },
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);

// Optional: Ensure unique application per user per exam
ExamRegistrationSchema.index({ userId: 1, examId: 1 }, { unique: true });

const ExamRegistration = mongoose.model(
  "ExamRegistration",
  ExamRegistrationSchema
);

export default ExamRegistration;
