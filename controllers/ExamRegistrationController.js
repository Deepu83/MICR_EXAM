import ExamRegistration from "../models/ExamRegistration.js";
import User from "../models/User.js";
import mongoose from "mongoose";



// ✅ Create a new exam registration (validate user only)
export const createRegistration = async (req, res) => {
  try {
    const { userId, examId, examDate, examCenter, paymentAmount } = req.body;

    if (!userId || !examId || !examDate || !examCenter || !paymentAmount) {
      return res.status(400).json({ msg: "All required fields must be provided" });
    }

    // ✅ Validate User exists
    const userExists = await User.findById(userId);
    if (!userExists) return res.status(404).json({ msg: "User not found" });

    // ✅ Check for duplicate registration
    const existingReg = await ExamRegistration.findOne({ userId, examId });
    if (existingReg) {
      return res.status(201).json({ msg: "User already registered for this exam", registration: existingReg });
    }

    // Optional: Auto-generate applicationNumber
    const lastReg = await ExamRegistration.find({ examId }).sort({ createdAt: -1 }).limit(1);
    const count = lastReg.length
      ? parseInt(lastReg[0].applicationNumber.split("-")[2]) + 1
      : 1;

    // const user = await Exam.findById(userId);
    // if (!exam) return res.status(404).json({ msg: "Exam not found" });

    const applicationNumber = `${exam.examCode}-${new Date().getFullYear()}-${String(count).padStart(5, "0")}`;

    const registration = new ExamRegistration({
      applicationNumber,
      userId: new mongoose.Types.ObjectId(userId),
      examId: new mongoose.Types.ObjectId(examId),
      applicationInfo: {
        examDate,
        examCenter,
        paymentAmount,
      },
    });

    await registration.save();
    res.status(201).json({ msg: "Exam registration created", registration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};



// ✅ Get all registrations
export const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await ExamRegistration.find()
      .populate("userId", "name email")
      .populate("examId", "examName examCode");
    res.status(200).json({ msg: "Registrations fetched", registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// ✅ Get registration by ID
export const getRegistrationById = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await ExamRegistration.findById(registrationId)
      .populate("userId", "name email")
      .populate("examId", "examName examCode");

    if (!registration) return res.status(404).json({ msg: "Registration not found" });

    res.status(200).json({ msg: "Registration fetched", registration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// ✅ Update result for a registration
export const updateResult = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const {
      marksObtained,
      percentage,
      grade,
      resultStatus,
      examAttemptedDate,
      resultPublishedDate,
      resultPublishedBy,
      remarks,
    } = req.body;

    const registration = await ExamRegistration.findById(registrationId);
    if (!registration) return res.status(404).json({ msg: "Registration not found" });

    registration.result = {
      marksObtained,
      percentage,
      grade,
      resultStatus,
      examAttemptedDate,
      resultPublishedDate,
      // Convert to ObjectId if provided
      resultPublishedBy: resultPublishedBy ? new mongoose.Types.ObjectId(resultPublishedBy) : null,
      remarks,
    };

    await registration.save();

    // Populate for response
    const populated = await ExamRegistration.findById(registrationId)
      .populate("userId", "name email")
      .populate("examId", "examName examCode")
      .populate("result.resultPublishedBy", "name email"); // optional if resultPublishedBy is user

    res.status(200).json({ msg: "Result updated", registration: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
