import Exam from "../models/Exam.js";

// Create a new exam
export const createExam = async (req, res) => {
  try {
    const {
      examName,
      examSubject,
      examDate,
      registrationStartDate,
      registrationEndDate,
      disclaimer,
      registrationAmount,
      candidateDeclaration,
      examStep,
    } = req.body;

    // Manual validation (extra safety before mongoose validation)
    if (!examName || !examSubject || !examDate || !registrationStartDate || !registrationEndDate || !registrationAmount || !candidateDeclaration || !examStep) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Create new exam
    const exam = new Exam({
      examName,
      examSubject,
      examDate,
      registrationStartDate,
      registrationEndDate,
      disclaimer,
      registrationAmount,
      candidateDeclaration,
      examStep, // must be "1", "2", "3A", or "3B"
    });

    await exam.save();

    res.status(201).json({
      success: true,
      message: "✅ Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "❌ Failed to create exam",
      error: error.message,
    });
  }
};

// Get all exams
export const getExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json({ success: true, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch exams", error: error.message });
  }
};

// Get single exam by ID
export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.status(200).json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch exam", error: error.message });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.status(200).json({ success: true, message: "Exam updated successfully", exam });
  } catch (error) {
    res.status(400).json({ success: false, message: "Failed to update exam", error: error.message });
  }
};

// Delete exam
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.status(200).json({ success: true, message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete exam", error: error.message });
  }
};
