import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({


  first_name: { type: String },
  last_name: { type: String },
  email: { type: String },
  gender: { type: String },
  phone: { type: String },
  dob: { type: String },

  username: { type: String, required: true },
  registration_number: { type: String },
//   password: { type: String },

  center_name: { type: String },
  city: { type: String },
  centerId: { type: String },

  photoUrl: { type: String },        // Uploaded to Cloudinary
  signatureUrl: { type: String },    // OPTIONAL – if needed later

  
  /** ------------------------------
   *   🆕 New Exam-Related Fields
   * ------------------------------ */
  date_of_examination: { type: String },   // New
  description: { type: String },           // New
  date_of_exam: { type: String },          // New
  reporting_time: { type: String },        // New
  gate_closing_time: { type: String },     // New
  paper_1: { type: String },         // New
    break: { type: String },     
  paper_2: { type: String },         // New
  paper_medium: { type: String },  
  course_name: { type: String },
    venue_of_center: { type: String },   
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Application", applicationSchema);
