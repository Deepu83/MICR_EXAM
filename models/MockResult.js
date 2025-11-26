

import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  question: { type: String, required: true },

  selectedAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  correctAnswer: { type: mongoose.Schema.Types.Mixed },

  status: {
    type: String,
    enum: ["correct", "incorrect", "pending-review"],
    default: "pending-review"
  },

  marksAwarded: { type: Number, default: 0 }
});

const mockResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest", required: true },

  score: { type: Number, required: true },

  // 👇👇 THIS WAS MISSING (This is why you saw answers: [])
  answers: [answerSchema],

  attemptedAt: { type: Date, default: Date.now },
});

export default mongoose.model("MockResult", mockResultSchema);
