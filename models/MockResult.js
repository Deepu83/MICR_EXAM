import mongoose from "mongoose";

const mockResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest", required: true },
  score: { type: Number, required: true },
  attemptedAt: { type: Date, default: Date.now },
});

export default mongoose.model("MockResult", mockResultSchema);
