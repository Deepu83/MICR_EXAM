// import mongoose from "mongoose";

// const examSchema = new mongoose.Schema({
//   code: { type: String, required: true },
//   title: String,
//   amountPayable: Number,
//   currency: String,
//   examCode: String,
//   backendCode: String,
//   requiredLevel: String,

//   centers: [
//     {
//       id: String,
//       name: String,
//       address: String
//     }
//   ],

//   // ✅ must be an object (subdocument), not String
//   details: {
//     module: { type: String },
//     subject: { type: String },
//     questions: { type: Number },
//     type: { type: String },
//      marks: { type: Number },        // total marks
//     mode: { type: String },     
//     duration:{type:String},
//     status: { type: String },
//     instructions: { type: String }
//   }
// });

// export default mongoose.model("Exam", examSchema);
import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: String,
  amountPayable: Number,
  currency: String,
  examCode: String,
  backendCode: String,
  requiredLevel: String,

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
});

export default mongoose.model("Exam", examSchema);
