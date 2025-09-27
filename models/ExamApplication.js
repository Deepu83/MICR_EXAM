// models/ExamApplication.js
import mongoose from "mongoose";

const examApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference User model
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam", // Reference Exam model
      required: true,
    },
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paymentReference: {
      type: String, // e.g., transaction ID from payment gateway
    },
  },
  { timestamps: true }
);

const ExamApplication = mongoose.model("ExamApplication", examApplicationSchema);

export default ExamApplication;
