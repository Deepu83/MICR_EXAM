// controllers/examApplicationController.js
import ExamApplication from "../models/ExamApplication.js";
import User from "../models/User.js";
import Exam from "../models/Exam.js";

// Apply for an exam
export const applyExam = async (req, res) => {
  try {
    const { userId, examId } = req.body;
    

    // Check if user & exam exist
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    // Prevent duplicate application
    const existingApplication = await ExamApplication.findOne({ user: userId, exam: examId });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: "Already applied for this exam" });
    }

    const application = new ExamApplication({
      user: userId,
      exam: examId,
    });

    await application.save();
    res.status(201).json({ success: true, message: "Applied successfully", application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to apply for exam", error: error.message });
  }
};

// Get all applications
export const getAllApplications = async (req, res) => {
  try {
    const applications = await ExamApplication.find()
      .populate("user", "email registerNo")
      .populate("exam", "examName examSubject examDate");
    res.json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch applications", error: error.message });
  }
};

// Get applications by user
export const getUserApplications = async (req, res) => {
  try {
    const { userId } = req.params;
    const applications = await ExamApplication.find({ user: userId })
      .populate("exam", "examName examSubject examDate");
    res.json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch user applications", error: error.message });
  }
};

// Update application status (admin use)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { applicationStatus, paymentStatus, paymentReference } = req.body;

    const application = await ExamApplication.findByIdAndUpdate(
      id,
      { applicationStatus, paymentStatus, paymentReference },
      { new: true }
    );

    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    res.json({ success: true, message: "Application updated", application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update application", error: error.message });
  }
};
