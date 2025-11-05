
// export default mongoose.model("Exam", examSchema);
import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: String,
    internationalAmount: Number, 
  amountPayable: Number,
  currency: String,
  // examCode: String,
   examCode: {
      type: String,
      enum: ["1", "1A", "1B", "2", "3A", "3B"], // ✅ Only allow these codes
      required: true,
    },
  backendCode: String,
  requiredLevel: String,

  paperMedium: { type: String }, 
  dateOfExam: { type: String },       // 📅 Exam date (can store in 'YYYY-MM-DD' format)
  breakTime: { type: String },        // ⏸ Example: "15 minutes"
  gateClosingTime: { type: String },  // 🚪 Example: "09:30 AM"


  //  papers: [
  //   {
  //     name: { type: String },        // e.g. "Paper 1"
  //     title: { type: String },       // e.g. "Essential Radiology"
  //     startTime: { type: String },   // e.g. "9:45 AM"
  //     endTime: { type: String }      // e.g. "10:45 AM"
  //   }
  // ],

  centers: {
    type: Map,
    of: [
      {
        id: String,
        name: String,
        address: String
      }
    ]
  },
  // ✅ Updated structure to match your screenshot
  details: {
    module: { type: String },

    // ✅ Nested stats object
    stats: {
      questions: { type: String },
      duration: { type: String },
      marks: { type: String },
      mode: { type: String },
      status: { type: String }
    },

    // ✅ Array of instructions
    instructions: [{ type: String }]

  }
  
},
{ strict: false } // ✅ <--- ALLOW EXTRA FIELDS
);

export default mongoose.model("Exam", examSchema);
