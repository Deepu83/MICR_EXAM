import Exam from "../models/Exam.js";

// Create new exam
export const createExam = async (req, res) => {
  try {
    // const {code}=req.body;
    // const existingExam=await Exam.findOne({code});
    // if(existingExam){
    //   return res.status(400).json({ message: `Exam with code "${code}" already registered` });

    // }

    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Get all exams
export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam by code
// export const getExamByCode = async (req, res) => {
//   try {
//     const exam = await Exam.findOne({ code: req.params.code });
//     console.log(req.params.code)
//     if (!exam) return res.status(404).json({ message: "Exam not found" });
//     res.status(200).json(exam);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// export const getExamByCode = async (req, res) => {
//   try {
//     const { examCode } = req.params;
//     console.log("Exam Code:", examCode);

//     // ✅ If examCode is a main step (like "1" or "3"), include its sub-parts (1A, 1B, etc.)
//     const examCodeRegex = new RegExp(`^${examCode}[A-Z]?$`, "i");

//     // ✅ Fetch exams that match examCode or its variants (like 1A, 1B)
//     const exams = await Exam.find({ examCode: { $regex: examCodeRegex } }).lean();

//     if (!exams || exams.length === 0) {
//       return res.status(404).json({ message: "Exam not found" });
//     }

//     // ✅ Format and clean data
//     const formattedExams = exams.map((exam) => {
//       const instructions =
//         exam.details?.instructions && Array.isArray(exam.details.instructions)
//           ? exam.details.instructions
//           : exam.instructions
//           ? Array.isArray(exam.instructions)
//             ? exam.instructions
//             : [exam.instructions]
//           : [];

//       const details = {
//         module: exam.module || exam.details?.module,
//         stats: {
//           questions: exam.questions || exam.details?.stats?.questions,
//           duration: exam.duration || exam.details?.stats?.duration,
//           marks: exam.marks || exam.details?.stats?.marks,
//           mode: exam.mode || exam.details?.stats?.mode,
//           status: exam.status || exam.details?.stats?.status || "Active",
//         },
//         instructions,
//       };

//       if (
//         !details.module &&
//         !details.stats.questions &&
//         !details.instructions.length
//       ) {
//         delete exam.details;
//       }

//       return { ...exam, details };
//     });

//     res.status(200).json(formattedExams);
//   } catch (error) {
//     console.error("Error fetching exams:", error);
//     res.status(500).json({ message: error.message });
//   }
// };




export const getExamByCode = async (req, res) => {
  try {
    const { examCode } = req.params;
    console.log("Exam Code:", examCode);

    // ✅ Handle complex exam hierarchies
    // Example:
    //  - "1" → matches "1", "1A", "1B"
    //  - "3" → matches "3", "3A", "3A1", "3A2", "3B", "3B1", "3B2"
    //  - "3A" → matches "3A", "3A1", "3A2"
    //  - "3B" → matches "3B", "3B1", "3B2"
    const examCodeRegex = new RegExp(`^${examCode}([A-Z]\\d*)?$`, "i");

    // ✅ Find exams that match this pattern
    const exams = await Exam.find({ examCode: { $regex: examCodeRegex } }).lean();

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // ✅ Format and clean exams
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

    res.status(200).json(formattedExams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: error.message });
  }
};



// ✅ Update exam by code
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { examcode: req.params.examcode },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.status(200).json({ message: "Exam updated successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ Delete exam by code
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ examcode: req.params.examcode });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.status(200).json({ message: "Exam deleted successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
