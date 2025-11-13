import Exam from "../models/Exam.js";
import ExamRegistration from "../models/ExamRegistration.js";

// Create new exam
export const createExam = async (req, res) => {
  try {


    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();

    // ✅ Total exams
    const totalExams = exams.length;

    // ✅ Active exams (status === "Open")
    const activeExams = exams.filter(
      exam => exam?.status?.toLowerCase() === "open"
    ).length;

    // Map exams to add requiredLevel
    const examsWithRequiredLevel = exams.map(exam => {
      let requiredLevel = null;

      switch (exam.examCode) {
        case "1A":
          requiredLevel = "1B";
          break;
        case "1B":
          requiredLevel = "1A";
          break;
        case "3A":
          requiredLevel = "3B";
          break;
        case "3B":
          requiredLevel = "3A";
        case "2":
          requiredLevel="2";
           break;
        case "3":
          requiredLevel="3";
          break;
        default:
          requiredLevel = null;
      }

      return {
        ...exam._doc,
        requiredLevel,
      };
    });

    res.status(200).json({
      totalExams,
      activeExams,
      exams: examsWithRequiredLevel,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const getAllExams = async (req, res) => {
//   try {
//     const exams = await Exam.find();

//     // ✅ Total exams
//     const totalExams = exams.length;

//     // ✅ Active exams (assuming status is at root level)
//     const activeExams = exams.filter(
//       exam => exam?.status?.toLowerCase() === "active"
//     ).length;

//     res.status(200).json({
//       totalExams,
//       activeExams,
//       exams, // full list of exams
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



export const getExamByCode = async (req, res) => {
  try {
    const { examCode } = req.params;
    console.log("Exam Code:", examCode);

    // Handle complex exam hierarchies
    const examCodeRegex = new RegExp(`^${examCode}([A-Z]\\d*)?$`, "i");

    // Find exams that match this pattern
    const exams = await Exam.find({ examCode: { $regex: examCodeRegex } }).lean();

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Count total and active exams
    const totalExams = exams.length;
    const activeExams = exams.filter(
      exam => (exam.status || exam.details?.stats?.status || "").toLowerCase() === "active"
    ).length;

    // Format and clean exams
    const formattedExams = exams.map((exam) => {
      const instructions =
        exam.details?.instructions && Array.isArray(exam.details.instructions)
          ? exam.details.instructions
          : exam.instructions
          ? Array.isArray(exam.instructions)
            ? exam.instructions
            : [exam.instructions]
          : [];

      const details = {
        module: exam.module || exam.details?.module,
        stats: {
          questions: exam.questions || exam.details?.stats?.questions,
          duration: exam.duration || exam.details?.stats?.duration,
          marks: exam.marks || exam.details?.stats?.marks,
          mode: exam.mode || exam.details?.stats?.mode,
          status: exam.status || exam.details?.stats?.status || "Active",
        },
        instructions,
      };

      if (
        !details.module &&
        !details.stats.questions &&
        !details.instructions.length
      ) {
        delete exam.details;
      }

      return { ...exam, details };
    });

    // Send response with totals
    res.status(200).json({
      totalExams,
      activeExams,
      exams: formattedExams
    });

  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: error.message });
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