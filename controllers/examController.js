import Exam from "../models/Exam.js";
import ExamRegistration from "../models/ExamRegistration.js";

// // Create new exam

import mongoose from "mongoose";



export const createExam = async (req, res) => {
  try {
    const examData = { ...req.body };

    // 🔴 Year is mandatory
    if (!examData.year) {
      return res.status(400).json({
        message: "Year is required",
      });
    }

    let stepGroup = null;

    switch (examData.examCode) {
      case "1":
      case "1A":
      case "1B":
        stepGroup = "STEP1";
        break;

      case "2":
        stepGroup = "STEP2";
        break;

      case "3":
        stepGroup = "STEP3";
        break;

      case "3A":
        stepGroup = "STEP3A";
        break;

      case "3B":
        stepGroup = "STEP3B";
        break;

      default:
        stepGroup = null;
    }

    /* =====================================================
       🔥 STEP-3 (PARENT)
       ===================================================== */
    if (examData.examCode === "3") {
      examData.combinedExamId = new mongoose.Types.ObjectId();
      examData.stepGroup = "STEP3";
      examData.parentId = null; // ROOT
    }

    /* =====================================================
       🔥 STEP-3A / STEP-3B (CHILDREN OF STEP-3)
       ===================================================== */
    else if (examData.examCode === "3A" || examData.examCode === "3B") {

      // 🔴 STEP-3 MUST exist
      const step3Parent = await Exam.findOne({
        examCode: "3",
        year: examData.year,
      });

      if (!step3Parent) {
        return res.status(400).json({
          message: "Create STEP-3 first with the same year",
        });
      }

      // ✅ Own combinedExamId (separate for 3A and 3B)
      const existingExam = await Exam.findOne({
        examCode: examData.examCode,
        year: examData.year,
      });

      examData.combinedExamId = existingExam
        ? existingExam.combinedExamId
        : new mongoose.Types.ObjectId();

      // ✅ BOTH 3A & 3B point to STEP-3
      examData.parentId = step3Parent._id;
      examData.step3CombinedId = step3Parent.combinedExamId;

      examData.stepGroup = stepGroup;
    }

    /* =====================================================
       🔥 STEP-1 & STEP-2 (UNCHANGED)
       ===================================================== */
    else if (stepGroup) {
      const existingExam = await Exam.findOne({
        stepGroup,
        year: examData.year,
      });

      examData.combinedExamId = existingExam
        ? existingExam.combinedExamId
        : new mongoose.Types.ObjectId();

      examData.stepGroup = stepGroup;
    }

    const exam = new Exam(examData);
    await exam.save();

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};




export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();

    // ✅ Total exams
    const totalExams = exams.length;

    // ✅ Active exams (assuming status is at root level)
    const activeExams = exams.filter(
      exam => exam?.status?.toLowerCase() === "active"
    ).length;

    res.status(200).json({
      totalExams,
      activeExams,
      exams, // full list of exams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//




export const getExamByCode = async (req, res) => {
  try {
    const { examCode } = req.params; // ✅ Correct param name
    console.log("Requested Exam Code:", examCode);

    // 🔍 Find all exams that match this code or its parts (like 1A, 1B)
    const examCodeRegex = new RegExp(`^${examCode}([A-Z]\\d*)?$`, "i");

    const exams = await Exam.find({ examCode: { $regex: examCodeRegex } });

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // ✅ Return array (safe for frontend .map())
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: error.message });
  }
};
//for 
export const getExamsByCombinedId = async (req, res) => {
  try {
    const { combinedExamId } = req.params;

    if (!combinedExamId) {
      return res.status(400).json({
        message: "combinedExamId is required"
      });
    }

    const exams = await Exam.find({
      combinedExamId
    }).sort({ dateOfExam: 1 }); // optional sorting

    if (!exams || exams.length === 0) {
      return res.status(404).json({
        message: "No exams found for this combinedExamId"
      });
    }

    res.status(200).json({
      combinedExamId,
      totalPapers: exams.length,
      exams
    });

  } catch (error) {
    console.error("Error fetching exams by combinedExamId:", error);
    res.status(500).json({
      message: error.message
    });
  }
};







// ✅ Update exam by code
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,   // ✅ update by _id
      req.body,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.status(200).json({ message: "Exam updated successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// ✅ Delete exam by code

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id); // ✅ delete by _id
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json({ message: "Exam deleted successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// 📊 Dashboard Statistics API (Fixed)
export const getExamDashboardStats = async (req, res) => {
  try {
    const exams = await Exam.find();

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "No exams found" });
    }

    // ✅ Total Exams
    const totalExams = exams.length;

    // ✅ Active Exams (check nested path details.stats.status)
    const activeExams = exams.filter(
      exam => exam?.status?.toLowerCase() === "active"
    ).length;

    // ✅ Average Questions (parse from nested stats)
    const questionCounts = exams
      .map(exam => parseInt(exam?.details?.stats?.questions))
      .filter(q => !isNaN(q));

    const avgQuestions =
      questionCounts.length > 0
        ? Math.round(questionCounts.reduce((a, b) => a + b, 0) / questionCounts.length)
        : 0;

    // ✅ Placeholder for total attempts (can be updated later)
    const totalAttempts = 0;

    return res.status(200).json({
      totalExams,
      activeExams,
      avgQuestions,
      totalAttempts,
    });
  } catch (error) {
    console.error("❌ Error in getExamDashboardStats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getExamRegistrationCount = async (req, res) => {
  try {
    const registrationCounts = await ExamRegistration.aggregate([
      {
        $group: {
          _id: "$examId",
          totalRegistrations: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "exams",
          localField: "_id",
          foreignField: "_id",
          as: "examDetails",
        },
      },
      { $unwind: "$examDetails" },
      {
        $project: {
          examId: "$examDetails._id",
          examCode: "$examDetails.examCode",
          subject: "$examDetails.subject",
          totalRegistrations: 1,
        },
      },
    ]);

    if (!registrationCounts || registrationCounts.length === 0) {
      return res.status(404).json({ message: "No registrations found" });
    }

    // ✅ Group by main exam code (remove subpart letters like "A", "B")
    const grouped = {};

    for (const exam of registrationCounts) {
      // Extract main code (like "1" from "1A")
      const mainCode = exam.examCode.match(/^\d+/)?.[0] || exam.examCode;

      if (!grouped[mainCode]) {
        grouped[mainCode] = {
          mainExamCode: mainCode,
          totalRegistrations: 0,
          subExams: [],
        };
      }

      // Add sub-exam details
      grouped[mainCode].subExams.push({
        examId: exam.examId,
        examCode: exam.examCode,
        title: exam.subject,
        totalRegistrations: exam.totalRegistrations,
      });

      // Add total of all sub-exams to main exam
      grouped[mainCode].totalRegistrations += exam.totalRegistrations;
    }

    // Convert object to array
    const groupedArray = Object.values(grouped);

    res.status(200).json({
      message: "Exam registration counts grouped successfully",
      data: groupedArray,
    });
  } catch (error) {
    console.error("Error fetching grouped registration counts:", error);
    res.status(500).json({ message: error.message });
  }
};



//


export const allowExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { allowed } = req.body; // true / false from admin

    // Validate exam ID
    if (!examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid exam ID" });
    }

    // Validate allowed flag
    if (typeof allowed !== "boolean") {
      return res.status(400).json({ msg: "allowed must be true or false" });
    }

    // Update exam status
    const exam = await Exam.findByIdAndUpdate(
      examId,
      { allowed },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ msg: "Exam not found" });
    }

    return res.status(200).json({
      msg: allowed
        ? `✅ Exam '${exam.examName}' is now allowed for admit card generation`
        : `⛔ Exam '${exam.examName}' is now NOT allowed`,
      exam,
    });

  } catch (err) {
    console.error("❌ allowExam error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// ✅ Get all exams (simple and clean)

