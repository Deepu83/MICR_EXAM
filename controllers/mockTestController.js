import MockTest from "../models/mockTestModel.js";
import User from "../models/User.js";
import MockResult from "../models/MockResult.js";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";          // <-- You must import Exam Model
import ExamRegistration from "../models/ExamRegistration.js";  // <-- Applications
// If edit-profile stored somewhere else, tell me.
import AutoSave from "../models/AutoSave.js"; // <-- AUTOSAVE MODEL

// 📌 SINGLE API FOR ALL DASHBOARD COUNTS
export const getAdminDashboardCounts = async (req, res) => {
  try {
    // 🔹 Total Exams
    const exams = await Exam.countDocuments();

    // 🔹 Total Students (all users)
    const students = await User.countDocuments();

    // 🔹 Total Applications (exam registrations)
    const applications = await ExamRegistration.countDocuments();

    // 🔹 Edit Profile Requests
    // Assuming user has field: requestEditProfile: true
    const editRequests = await User.countDocuments({ requestEditProfile: true });

    // 🔹 Total Mock Tests
    const mockTests = await MockTest.countDocuments();

    res.status(200).json({
      exams,
      students,
      applications,
      editRequests,
      mockTests
    });

  } catch (error) {
    res.status(500).json({
      msg: "Error fetching dashboard counts",
      error: error.message,
    });
  }
};
import cloudinary from "../config/cloudinary.js";

export const createMockTest = async (req, res) => {
  try {
    console.log("---------- CREATE MOCK TEST START ----------");

    console.log("📌 Incoming Files:", req.files);
    console.log("📌 Incoming Body:", req.body);

    // const mockData = JSON.parse(req.body.data);
//

     let mockData;

    if (req.body.data) {
      // FormData request
      try {
        mockData = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({ msg: "Invalid JSON inside 'data'" });
      }
    } else {
      // Raw JSON request
      mockData = req.body;
    }
    console.log("📌 Parsed mockData:", mockData);

    const finalQuestions = [];

    for (let i = 0; i < mockData.questions.length; i++) {
      const q = mockData.questions[i];
      console.log(`\n🟦 Processing Question #${i}`, q);

      let images = [];
      const totalImages = q.imageCount;
for (let imgIndex = 0; imgIndex < totalImages; imgIndex++) {
  const key = `questionImage_${i}_${imgIndex}`;
  console.log(`🔍 Checking file key: ${key}`);

  // Find file in req.files array
  const file = req.files.find(f => f.fieldname === key);

  if (file) {
    console.log(`📤 Found file for ${key}: ${file.originalname}`);

    try {
      const uploadResult = await cloudinary.uploader.upload(
        file.path,
        {
          folder: "mockTests/questions",
          resource_type: "auto",
        }
      );

      console.log(`✅ Uploaded Image: ${uploadResult.secure_url}`);

      images.push({
        url: uploadResult.secure_url,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        caption: "",
        altText: "",
        type: "jpg",
      });

    } catch (uploadErr) {
      console.error(`❌ Cloudinary Upload Failed for ${key}:`, uploadErr);
    }

  } else {
    console.warn(`⚠ No file received for key: ${key}`);
  }
}


      finalQuestions.push({
        ...q,
        images: images,   // must be array of objects
      });

      console.log(`📌 Final saved images for Q${i}:`, images);
    }

    const newMockTest = new MockTest({
      ...mockData,
      questions: finalQuestions,
    });

    await newMockTest.save();

    console.log("🎉 Mock Test Saved Successfully!");
    res.status(201).json({
      msg: "Mock test created successfully",
      mockTest: newMockTest,
    });

  } catch (err) {
    console.error("❌ ERROR IN createMockTest:", err);
    res.status(500).json({
      msg: "Error creating mock test",
      error: err.message,
    });
  }
};
//deletel
export const deleteMockTest = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑 DELETE MOCK TEST:", id);

    const mock = await MockTest.findById(id);

    if (!mock) {
      return res.status(404).json({ msg: "Mock test not found" });
    }


    await MockTest.findByIdAndDelete(id);

    console.log("✅ Mock Test Deleted Successfully");

    res.status(200).json({
      msg: "Mock test deleted successfully",
      deletedId: id,
    });

  } catch (err) {
    console.error("❌ ERROR IN deleteMockTest:", err);
    res.status(500).json({
      msg: "Error deleting mock test",
      error: err.message,
    });
  }
};






export const getAllMockTests = async (req, res) => {
  try {
    const mockTests = await MockTest.find().sort({ createdAt: -1 }).lean();

    // 🔹 Remove correctAnswer from every question in every mock test
    const safeMockTests = mockTests.map((test) => ({
      ...test,
      questions: test.questions.map(({ correctAnswer, ...rest }) => rest),
    }));

    res.status(200).json(safeMockTests);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching mock tests", error: err.message });
  }
};

// ✅ Get Single Mock Test by ID
export const getMockTestById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "Invalid MockTest ID" });
  }

  try {
    const mockTest = await MockTest.findById(id).lean();
    if (!mockTest) return res.status(404).json({ msg: "Mock test not found" });

    const safeQuestions = mockTest.questions.map(({ correctAnswer, ...rest }) => rest);

    res.status(200).json({ ...mockTest, questions: safeQuestions });
  } catch (err) {
    res.status(500).json({ msg: "Error fetching mock test", error: err.message });
  }
};







export const submitMockTest = async (req, res) => {
  try {
    const { mockTestId, userId, answers } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const mockTest = await MockTest.findById(mockTestId);
    if (!mockTest) return res.status(404).json({ msg: "Mock test not found" });

    let score = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let results = [];

    mockTest.questions.forEach((q) => {
      const userAns = answers.find(a => a.questionId === q._id.toString());

      // Base object
      let result = {
        questionId: q._id,
        question: q.question,
        selectedAnswer: userAns ? userAns.selected : "",
        correctAnswer: q.correctAnswer || q.correctAnswers,
      };

      // ======================================================
      // 📝 SUBJECTIVE (Pending Review)
      // ======================================================
      if (q.type === "subjective") {
        result.status = "pending-review";
        result.marksAwarded = 0;
        results.push(result);
        return;
      }

      // ======================================================
      // 🔘 MULTIPLE-CHOICE (Multi Select)
      // ======================================================
      if (q.type === "multiple-choice") {
        const correct = q.correctAnswers || [];
        const selected = Array.isArray(userAns?.selected) ? userAns.selected : [];

        const isCorrect =
          JSON.stringify(correct.sort()) === JSON.stringify(selected.sort());

        result.status = isCorrect ? "correct" : "incorrect";
        result.marksAwarded = isCorrect ? q.marks : 0;

        if (isCorrect) {
          score += q.marks;
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }

        results.push(result);
        return;
      }

      // ======================================================
      // 🔘 OBJECTIVE / TRUE-FALSE
      // ======================================================
      const isCorrect = userAns?.selected === q.correctAnswer;

      result.status = isCorrect ? "correct" : "incorrect";
      result.marksAwarded = isCorrect ? q.marks : 0;

      if (isCorrect) {
        score += q.marks;
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }

      results.push(result);
    });

    const totalQuestions = mockTest.questions.length;
    const percentage = (correctAnswers / totalQuestions) * 100;

    const mockResult = new MockResult({
      userId,
      mockTestId,
      score,
      answers: results,
    });

    await mockResult.save();

    res.status(200).json({
      msg: "Test submitted successfully",
      score,
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      percentage,
      results,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error submitting mock test", error: err.message });
  }
};

// ✅ Get Mock Test Count

export const getAllSubmittedMockTests = async (req, res) => {
  try {
    // Only fetch submissions that have a valid mockTestId
    const submissions = await MockResult.find({
      mockTestId: { $exists: true, $ne: null },
      answers: { $exists: true, $ne: [] } // optional: only submissions with answers
    }).lean();

    const formatted = await Promise.all(
      submissions.map(async (sub) => {
        let student = null;
        let mockTest = null;

        // Fetch student details if valid
        if (sub.userId && mongoose.Types.ObjectId.isValid(sub.userId)) {
          student = await User.findById(sub.userId)
            .select("name email")
            .lean();
        }

        // Fetch mock test details if valid
        if (sub.mockTestId && mongoose.Types.ObjectId.isValid(sub.mockTestId)) {
          mockTest = await MockTest.findById(sub.mockTestId)
            .select("title")
            .lean();
        }

        return {
          student,
          mockTest,
          score: sub.score,
          totalQuestions: sub.answers?.length || 0,
          submittedAt: sub.createdAt,
          answers: sub.answers || [],
        };
      })
    );

    // Remove any null entries just in case
    const filtered = formatted.filter(f => f.mockTest !== null);

    res.status(200).json(filtered);

  } catch (err) {
    console.error("Error in getAllSubmittedMockTests:", err);
    res.status(500).json({ msg: "Error fetching submissions", error: err.message });
  }
};


//edit
export const updateMockTest = async (req, res) => {
  try {
    console.log("---------- UPDATE MOCK TEST START ----------");

    const mockTestId = req.params.id;
    console.log("🆔 Editing ID:", mockTestId);

    let mockData;

    if (req.body.data) {
      try {
        mockData = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({ msg: "Invalid JSON inside 'data'" });
      }
    } else {
      mockData = req.body;
    }

    console.log("📌 Parsed mockData:", mockData);

    const finalQuestions = [];

    for (let i = 0; i < mockData.questions.length; i++) {
      const q = mockData.questions[i];
      console.log(`\n🟦 Processing Question #${i}`, q);

      let images = q.images || []; // Existing images

      const totalImages = q.imageCount ?? 0;

      for (let imgIndex = 0; imgIndex < totalImages; imgIndex++) {
        const key = `questionImage_${i}_${imgIndex}`;
        console.log(`🔍 Checking file key: ${key}`);

        const file = req.files?.find((f) => f.fieldname === key);

        if (file) {
          console.log(`📤 Found NEW file: ${file.originalname}`);

          try {
            const uploadResult = await cloudinary.uploader.upload(file.path, {
              folder: "mockTests/questions",
              resource_type: "auto",
            });

            console.log(`✅ Uploaded Image: ${uploadResult.secure_url}`);

            images.push({
              url: uploadResult.secure_url,
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              caption: "",
              altText: "",
              type: "jpg",
            });

          } catch (uploadErr) {
            console.error(`❌ Upload Failed for ${key}:`, uploadErr);
          }

        } else {
          console.warn(`⚠ No new file received for key: ${key} (keeping existing images if any)`);
        }
      }

      finalQuestions.push({
        ...q,
        images,
      });

      console.log(`📌 Final Images for Q${i}:`, images);
    }

    const updatedMockTest = await MockTest.findByIdAndUpdate(
      mockTestId,
      {
        ...mockData,
        questions: finalQuestions,
      },
      { new: true } // return updated document
    );

    if (!updatedMockTest) {
      return res.status(404).json({ msg: "Mock test not found" });
    }

    console.log("🎉 Mock Test Updated Successfully!");
    res.status(200).json({
      msg: "Mock test updated successfully",
      mockTest: updatedMockTest,
    });

  } catch (err) {
    console.error("❌ ERROR IN updateMockTest:", err);
    res.status(500).json({
      msg: "Error updating mock test",
      error: err.message,
    });
  }
};



export const autoSaveMockTest = async (req, res) => {
  try {
    const { mockTestId, userId, questionId, selectedAnswer } = req.body;

    if (!mockTestId || !userId || !questionId) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Check if AutoSave exists for this test & user
    let autoSave = await AutoSave.findOne({ mockTestId, userId });

    if (!autoSave) {
      // Create Autosave first time
      autoSave = new AutoSave({
        mockTestId,
        userId,
        answers: [{ questionId, selectedAnswer }]
      });
    } else {
      // Modify updated answer
      const answerIndex = autoSave.answers.findIndex(a => a.questionId === questionId);

      if (answerIndex > -1) {
        autoSave.answers[answerIndex].selectedAnswer = selectedAnswer;
        autoSave.answers[answerIndex].updatedAt = new Date();
      } else {
        autoSave.answers.push({ questionId, selectedAnswer });
      }
    }

    await autoSave.save();

    return res.status(200).json({
      msg: "Answer autosaved successfully",
      autoSave
    });

  } catch (err) {
    res.status(500).json({ msg: "Error auto-saving answer", error: err.message });
  }
};


//route
// GET /api/mocktests/results/all
export const getAllMockTestsResults = async (req, res) => {
  try {
    // 1. Get all AutoSave entries
    const allAutoSaves = await AutoSave.find().sort({ createdAt: 1 });

    const resultsByTest = {};

    for (const autoSave of allAutoSaves) {
      const { mockTestId, userId, answers } = autoSave;

      // Get user info
      const user = await User.findById(userId);
      const userName = user ? user.name || "Unknown User" : "Unknown User";
      const userEmail = user ? user.email || null : null;

      // Calculate user's result
      let correctCount = 0;
      const detailedResults = answers.map(a => {
        const isCorrect = Array.isArray(a.correctAnswer)
          ? JSON.stringify(a.correctAnswer.sort()) ===
            JSON.stringify((a.selectedAnswer || []).sort())
          : a.correctAnswer === a.selectedAnswer;

        if (isCorrect) correctCount++;

        return {
          questionId: a.questionId,
          question: a.question,
          correctAnswer: a.correctAnswer || null,
          userAnswer: a.selectedAnswer || null,
          isCorrect
        };
      });

      const totalQuestions = answers.length;

      const userResult = {
        userId,
        name: userName,
        email: userEmail,
        totalQuestions,
        correctAnswers: correctCount,
        wrongAnswers: totalQuestions - correctCount,
        score: correctCount,
        scorePercentage: ((correctCount / totalQuestions) * 100).toFixed(2),
        detailedResults
      };

      // Group results by mockTestId
      if (!resultsByTest[mockTestId]) {
        resultsByTest[mockTestId] = {
          mockTestId,
          results: [userResult]
        };
      } else {
        resultsByTest[mockTestId].results.push(userResult);
      }
    }

    return res.status(200).json({
      results: Object.values(resultsByTest)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      msg: "Error fetching all mock test results",
      error: err.message
    });
  }
};