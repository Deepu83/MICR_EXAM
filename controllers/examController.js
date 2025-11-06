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



export const getExamByCode = async (req, res) => {
  try {
    const { examCode } = req.params;
    console.log("Exam Code:", examCode);

    // ✅ Find by examCode
    const exam = await Exam.find({ examCode }).lean();

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // ✅ Safely handle nested instructions (whether stored in details or root)
    const instructions =
      exam.details?.instructions && Array.isArray(exam.details.instructions)
        ? exam.details.instructions
        : exam.instructions
        ? Array.isArray(exam.instructions)
          ? exam.instructions
          : [exam.instructions]
        : [];

    // ✅ Combine all details neatly
    const fullExamDetails = {
      ...exam,
      details: {
        stats: {
          questions: exam.questions || exam.details?.stats?.questions,
          duration: exam.duration || exam.details?.stats?.duration,
          marks: exam.marks || exam.details?.stats?.marks,
          mode: exam.mode || exam.details?.stats?.mode,
          status: exam.status || exam.details?.stats?.status || "Active",
        },
        module: exam.module || exam.details?.module,
        // instructions,
      },
    };
  res.status(200).json(fullExamDetails);
    // res.status(200).json(fullExamDetails);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: error.message });
  }
};







// ✅ Update exam by code
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { code: req.params.code },
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
    const exam = await Exam.findOneAndDelete({ code: req.params.code });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.status(200).json({ message: "Exam deleted successfully", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
