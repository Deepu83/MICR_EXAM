

// import ExamRegistration from "../models/ExamRegistration.js";
// import User from "../models/User.js";
// import mongoose from "mongoose";

// export const createRegistration = async (req, res) => {
//   try {
//     const { userId, examId, examDate, examCenter, paymentAmount, examStep } = req.body;

//     // ✅ Validate required fields
//     if (!userId || !examId || !examDate || !examCenter || !paymentAmount || !examStep) {
//       return res.status(400).json({ msg: "All required fields must be provided" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     // ✅ Check if user already registered for this exam
//     let registration = await ExamRegistration.findOne({ userId, examId });

//     if (!registration) {
//       // ✅ Generate EXAM2025-394 pattern with unique random digits
//       const currentYear = new Date().getFullYear();
//       let applicationNumber;
//       let isUnique = false;

//       // Retry until we find a unique application number
//       while (!isUnique) {
//         const randomDigits = Math.floor(100 + Math.random() * 900); // 3 random digits
//         applicationNumber = `EXAM${currentYear}-${randomDigits}`;

//         const existing = await ExamRegistration.findOne({ applicationNumber });
//         if (!existing) isUnique = true;
//       }

//       // ✅ Create new registration
//       registration = new ExamRegistration({
//         applicationNumber,
//         userId: new mongoose.Types.ObjectId(userId),
//         examId: new mongoose.Types.ObjectId(examId),
//         applicationInfo: { examDate, examCenter, paymentAmount },
//       });

//       await registration.save();
//     }

//     // ✅ Update user progression (store applicationNumber in applicationId field)
//     user.progression = user.progression || {};

//     switch (examStep) {
//       case "1":
//         user.progression.step1 = user.progression.step1 || {};
//         user.progression.step1.papers = user.progression.step1.papers || {};
//         user.progression.step1.papers.paper1 = user.progression.step1.papers.paper1 || {};
//         user.progression.step1.papers.paper2 = user.progression.step1.papers.paper2 || {};

//         user.progression.step1.papers.paper1.applicationId = registration.applicationNumber;
//         user.progression.step1.papers.paper2.applicationId = registration.applicationNumber;
//         break;

//       case "2":
//         user.progression.step2 = user.progression.step2 || {};
//         user.progression.step2.applicationId = registration.applicationNumber;
//         break;

//       case "3A":
//         user.progression.step3 = user.progression.step3 || {};
//         user.progression.step3.partA = user.progression.step3.partA || {};
//         user.progression.step3.partA.applicationId = registration.applicationNumber;
//         break;

//       case "3B":
//         user.progression.step3 = user.progression.step3 || {};
//         user.progression.step3.partB = user.progression.step3.partB || {};
//         user.progression.step3.partB.applicationId = registration.applicationNumber;
//         break;

//       default:
//         return res.status(400).json({ msg: "Invalid examStep" });
//     }

//     await user.save();

//     res.status(200).json({
//       msg: "Exam registration linked to user progression successfully",
//       registration,
//     });

//   } catch (err) {
//     console.error("❌ Server Error:", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };

import ExamRegistration from "../models/ExamRegistration.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const createRegistration = async (req, res) => {
  try {
    const {
      userId,
      examId,
      examDate,
      // examCenter,
      paymentAmount,
      examCode,        // changed from examStep
      currency,
      paymentMode,
      transactionId,
      country,
      // exchangeRate,
      remarks
    } = req.body;

    // ✅ Validate required fields
    if (!userId || !examId || !examDate || !paymentAmount || !examCode) {
      return res.status(400).json({ msg: "All required fields must be provided" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Check if user already registered for this exam
    let registration = await ExamRegistration.findOne({ userId, examId });

    if (!registration) {
      // ✅ Generate EXAM2025-394 pattern with unique random digits
      const currentYear = new Date().getFullYear();
      let applicationNumber;
      let isUnique = false;

      while (!isUnique) {
        const randomDigits = Math.floor(100 + Math.random() * 900); // 3 random digits
        applicationNumber = `EXAM${currentYear}-${randomDigits}`;

        const existing = await ExamRegistration.findOne({ applicationNumber });
        if (!existing) isUnique = true;
      }

      // ✅ Create new registration with optional fields
      registration = new ExamRegistration({
        applicationNumber,
        userId: new mongoose.Types.ObjectId(userId),
        examId: new mongoose.Types.ObjectId(examId),
        applicationInfo: {
          examDate,
          examCenter,
          paymentAmount,
          currency: currency || "INR",
          paymentMode: paymentMode || "Razorpay",
          transactionId: transactionId || "",
          country: country || "India",
          exchangeRate: exchangeRate || 1,
          remarks: remarks || "",
          paymentDate: paymentAmount ? new Date() : null,
        },
      });

      await registration.save();
    }

    // ✅ Update user progression (store applicationNumber in applicationId field)
    user.progression = user.progression || {};

    switch (examCode) {   // changed from examStep
      case "1":
        user.progression.step1 = user.progression.step1 || {};
        user.progression.step1.papers = user.progression.step1.papers || {};
        user.progression.step1.papers.paper1 = user.progression.step1.papers.paper1 || {};
        user.progression.step1.papers.paper2 = user.progression.step1.papers.paper2 || {};

        user.progression.step1.papers.paper1.applicationId = registration.applicationNumber;
        user.progression.step1.papers.paper2.applicationId = registration.applicationNumber;
        break;

      case "2":
        user.progression.step2 = user.progression.step2 || {};
        user.progression.step2.applicationId = registration.applicationNumber;
        break;

      case "3A":
        user.progression.step3 = user.progression.step3 || {};
        user.progression.step3.partA = user.progression.step3.partA || {};
        user.progression.step3.partA.applicationId = registration.applicationNumber;
        break;

      case "3B":
        user.progression.step3 = user.progression.step3 || {};
        user.progression.step3.partB = user.progression.step3.partB || {};
        user.progression.step3.partB.applicationId = registration.applicationNumber;
        break;

      default:
        return res.status(400).json({ msg: "Invalid examCode" });
    }

    await user.save();

    res.status(200).json({
      msg: "Exam registration linked to user progression successfully",
      registration,
      examCode   // optionally include examCode in response
    });

  } catch (err) {
    console.error("❌ Server Error:", err);
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
