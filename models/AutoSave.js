import mongoose from "mongoose";

const autoSaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest", required: true },
  answers: [
    {
      questionId: { type: String },
      selectedAnswer: mongoose.Schema.Types.Mixed, // can be array or string
      updatedAt: { type: Date, default: Date.now },
    }
  ]
}, { timestamps: true });

export default mongoose.model("AutoSave", autoSaveSchema);
