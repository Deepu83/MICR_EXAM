import MockTest from "../models/mockTestModel.js";
import User from "../models/User.js";
import MockResult from "../models/MockResult.js";
// ✅ Create Mock Test
export const createMockTest = async (req, res) => {
  try {
    const mockTest = new MockTest(req.body);
    await mockTest.save();
    res.status(201).json({ msg: "Mock Test created successfully", mockTest });
  } catch (err) {
    res.status(500).json({ msg: "Error creating mock test", error: err.message });
  }
};

// ✅ Get All Mock Tests
// export const getAllMockTests = async (req, res) => {
//   try {
//     const mockTests = await MockTest.find().sort({ createdAt: -1 });
//     res.status(200).json(mockTests);
//   } catch (err) {
//     res.status(500).json({ msg: "Error fetching mock tests", error: err.message });
//   }
// };
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
  try {
    const mockTest = await MockTest.findById(req.params.id).lean(); // use lean() for plain object

    if (!mockTest) {
      return res.status(404).json({ msg: "Mock test not found" });
    }

    // 🔹 Remove correctAnswer from each question
    const safeQuestions = mockTest.questions.map(({ correctAnswer, ...rest }) => rest);

    // 🔹 Return test without correct answers
    const safeMockTest = {
      ...mockTest,
      questions: safeQuestions,
    };

    res.status(200).json(safeMockTest);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching mock test", error: err.message });
  }
};




// ✅ Submit Mock Test
export const submitMockTest = async (req, res) => {
  try {
    const { mockTestId, userId, answers } = req.body;

    // 🔹 Step 1: Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 🔹 Step 2: Validate test
    const mockTest = await MockTest.findById(mockTestId);
    if (!mockTest) return res.status(404).json({ msg: "Mock test not found" });

    // 🔹 Step 3: Compare answers
    let score = 0;
    const results = [];

    mockTest.questions.forEach((q) => {
      const userAnswer = answers.find(a => a.questionId === q._id.toString());
      const isCorrect = userAnswer && userAnswer.selected === q.correctAnswer;

      results.push({
        questionId: q._id,
        question: q.question,
        selectedAnswer: userAnswer ? userAnswer.selected : null,
        correctAnswer: q.correctAnswer,
        isCorrect,
      });

      if (isCorrect) score += 1;
    });

    // 🔹 Step 4: Save result
    const mockResult = new MockResult({
      userId: user._id,
      mockTestId: mockTest._id,
      score,
    });
    await mockResult.save();

    res.status(200).json({
      msg: "Test submitted successfully",
      user: { name: user.name, email: user.email },
      score,
      total: mockTest.questions.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ msg: "Error submitting mock test", error: err.message });
  }
};
