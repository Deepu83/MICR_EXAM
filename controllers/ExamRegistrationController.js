import ExamRegistration from "../models/ExamRegistration.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

// import User from "../models/User.js";



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



export const createOrder = async (req, res) => {
  try {
    const { paymentAmount, currency } = req.body;

    if (!paymentAmount) {
      return res.status(400).json({ msg: "Amount is required" });
    }

    const orderOptions = {
      amount: paymentAmount * 100, // paise
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(orderOptions);

    // ✅ Log order details to console
    console.log("✅ Razorpay Order Created:");
    console.log("Order ID:", order.id);
    console.log("Amount (in paise):", order.amount);
    console.log("Currency:", order.currency);
    console.log("Receipt:", order.receipt);
    console.log("Full Order Object:", order);


    res.status(200).json({
      msg: "Order created",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID, // send to frontend for checkout
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};







export const verifyPaymentAndRegister = async (req, res) => {
  try {
    const {
      userId,
      examId,
      examDate,
      paymentAmount,
      examCode,
      order_id,
      payment_id,
      signature,
      currency,
      country,
      remarks,
      centers,
    } = req.body;

    console.log("🟢 Payment Verification Request Received");
    console.log("Order ID:", order_id);
    console.log("Payment ID:", payment_id);
    console.log("Received Signature:", signature);

    if (!userId || !examId || !order_id || !payment_id || !signature) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // ✅ Verify Razorpay signature
    const generatedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).json({ msg: "Payment verification failed" });
    }

    // ✅ Fetch user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Check if already registered
    // const existingReg = await ExamRegistration.findOne({ userId, examId });
    // if (existingReg) {
    //   return res.status(400).json({ msg: "User already registered for this exam" });
    // }
// ✅ Check previous registrations for the same exam
// ✅ Improved existing registration + re-fill logic
const lastReg = await ExamRegistration.findOne({ userId, examId }).sort({ createdAt: -1 });

let allowRegistration = true;

// Check progression status for the relevant step
const getProgressionStatus = () => {
  const prog = user.progression || {};
  switch (examCode) {
    case "1":
    case "1A":
      return prog.step1?.papers?.paper1?.status;
    case "1B":
      return prog.step1?.papers?.paper2?.status;
    case "2":
      return prog.step2?.status;
    case "3":
    case "3A":
      return prog.step3?.partA?.status;
    case "3B":
      return prog.step3?.partB?.status;
    default:
      return null;
  }
};

const progStatus = getProgressionStatus();
const lastStatus = lastReg?.applicationInfo?.resultStatus || lastReg?.status || progStatus || "unknown";

if (lastReg && lastReg.applicationInfo?.paymentStatus === "paid") {
  if (lastStatus !== "failed") {
    // only block if last attempt was not failed
    allowRegistration = false;
  }
}

// Block registration if not eligible
if (!allowRegistration) {
  return res.status(400).json({ msg: "User already registered for this exam" });
}

// ✅ Auto-increment attempt number
let attemptNumber = 1;
if (lastReg) {
  attemptNumber = (lastReg.attemptNumber || 1) + 1;
}

//autoincreament 

    const currentYear = new Date().getFullYear();

    // Function to generate unique application number
    const generateUniqueAppNumber = async () => {
      let appNum, isUnique = false;
      while (!isUnique) {
        const randomDigits = Math.floor(100 + Math.random() * 900);
        // appNum = `EXAM${currentYear}-${randomDigits}`;
         appNum = `EXAM${currentYear}0${randomDigits}`;
        const exists = await ExamRegistration.findOne({ applicationNumber: appNum });
        if (!exists) isUnique = true;
      }
      return appNum;
    };

    // ✅ Handle different exam codes
    let registrations = [];

    if (examCode === "1") {
      // Generate three unique application numbers
      const appNum1 = await generateUniqueAppNumber(); // Paper 1
      const appNum2 = await generateUniqueAppNumber(); // Paper 2
      const appNumOverall = await generateUniqueAppNumber(); // Step 1 overall

      // Save registration for Paper 1
      const registration1 = new ExamRegistration({
        applicationNumber: appNum1,
        userId: new mongoose.Types.ObjectId(userId),
        examId,
        applicationInfo: {
          examDate,
          paymentAmount,
          currency: currency || "INR",
          paymentMode: "Razorpay",
          transactionId: payment_id,
          country: country || "India",
          remarks: remarks || "",
          paymentStatus: "paid",
        },
      });

      // Save registration for Paper 2
      const registration2 = new ExamRegistration({
        applicationNumber: appNum2,
        userId: new mongoose.Types.ObjectId(userId),
        examId,
        applicationInfo: {
          examDate,
          paymentAmount,
          currency: currency || "INR",
          paymentMode: "Razorpay",
          transactionId: payment_id,
          country: country || "India",
          remarks: remarks || "",
          paymentStatus: "paid",
        },

        //add 
                centers,
      });

      // Save both registrations
      await registration1.save();
      await registration2.save();

      // ✅ Update progression
      user.progression = user.progression || {};
      user.progression.step1 = user.progression.step1 || {};
      user.progression.step1.papers = user.progression.step1.papers || {};

      // Paper 1 and 2 data
      user.progression.step1.papers.paper1 = {
        applicationId: appNum1,
        status: "submitted",
      };
      user.progression.step1.papers.paper2 = {
        applicationId: appNum2,
        status: "submitted",
      };

      // ✅ Add overall Step 1 applicationId
      user.progression.step1.applicationId = appNumOverall;
      user.progression.step1.overallStatus = "filled";

      registrations.push(registration1, registration2);
    }
//for 3
// ✅ For combined Step 3 (3A + 3B)
else if (examCode === "3") {
  // Generate three unique application numbers
  const appNum3A = await generateUniqueAppNumber(); // Step 3A
  const appNum3B = await generateUniqueAppNumber(); // Step 3B
  const appNumOverall3 = await generateUniqueAppNumber(); // Step 3 overall

  // Save registration for Part A
  const registration3A = new ExamRegistration({
    applicationNumber: appNum3A,
    userId: new mongoose.Types.ObjectId(userId),
    examId,
    applicationInfo: {
      examDate,
      paymentAmount,
      currency: currency || "INR",
      paymentMode: "Razorpay",
      transactionId: payment_id,
      country: country || "India",
      remarks: remarks || "",
      paymentStatus: "paid",
    },
    centers,
  });

  // Save registration for Part B
  const registration3B = new ExamRegistration({
    applicationNumber: appNum3B,
    userId: new mongoose.Types.ObjectId(userId),
    examId,
    applicationInfo: {
      examDate,
      paymentAmount,
      currency: currency || "INR",
      paymentMode: "Razorpay",
      transactionId: payment_id,
      country: country || "India",
      remarks: remarks || "",
      paymentStatus: "paid",
    },
    centers,
  });

  // Save both registrations
  await registration3A.save();
  await registration3B.save();

  // ✅ Update progression for Step 3
  user.progression = user.progression || {};
  user.progression.step3 = user.progression.step3 || {};

  user.progression.step3.partA = {
    applicationId: appNum3A,
    status: "submitted",
  };

  user.progression.step3.partB = {
    applicationId: appNum3B,
    status: "submitted",
  };

  user.progression.step3.applicationId = appNumOverall3;
  user.progression.step3.overallStatus = "filled";

  registrations.push(registration3A, registration3B);
}
///

    // ✅ For single-paper exam codes
    else if (["1A", "1B", "2", "3A", "3B"].includes(examCode)) {
      const appNum = await generateUniqueAppNumber();

      const registration = new ExamRegistration({
        applicationNumber: appNum,
        userId: new mongoose.Types.ObjectId(userId),
        examId,
        applicationInfo: {
          examDate,
          paymentAmount,
          currency: currency || "INR",
          paymentMode: "Razorpay",
          transactionId: payment_id,
          country: country || "India",
          remarks: remarks || "",
          paymentStatus: "paid",
        },

        //add 
                centers,
      });

      await registration.save();
      registrations.push(registration);

      user.progression = user.progression || {};

      switch (examCode) {
        case "1A":
          user.progression.step1 = user.progression.step1 || {};
          user.progression.step1.papers = user.progression.step1.papers || {};

          
  // 🧩 Re-fillup logic for Paper 1 if failed
  if (user.progression.step1.papers.paper1?.status === "failed") {
    console.log("Re-fillup for Step 1 Paper 1");
    user.progression.step1.papers.paper1 = {};
  }

          user.progression.step1.papers.paper1 = {
            paid: true,
            paymentId: payment_id,
            date: examDate,
            applicationId: appNum,
            status: "submitted",
          };

            if (user.progression.step3.partA && user.progression.step3.partB) {
    const appNumOverall3 = await generateUniqueAppNumber();
    user.progression.step3.applicationId = appNumOverall3;
    user.progression.step3.overallStatus = "submitted";
  }
          break;

        case "1B":
          user.progression.step1 = user.progression.step1 || {};
          user.progression.step1.papers = user.progression.step1.papers || {};

            if (user.progression.step1.papers.paper2?.status === "failed") {
    console.log("Re-fillup for Step 1 Paper 2");
    user.progression.step1.papers.paper2 = {};
  }
          user.progression.step1.papers.paper2 = {
            paid: true,
            paymentId: payment_id,
            date: examDate,
            applicationId: appNum,
            status: "submitted",
          };

           // ✅ If both partA and partB exist, create overall Step 3 ID
  if (user.progression.step3.partA && user.progression.step3.partB) {
    const appNumOverall3 = await generateUniqueAppNumber();
    user.progression.step3.applicationId = appNumOverall3;
    user.progression.step3.overallStatus = "submitted";
  }
          break;

        case "2":
           if (user.progression.step2?.status === "failed") {
    console.log("Re-fillup for Step 2");
    user.progression.step2 = {};
  }
          user.progression.step2 = {
            applicationId: appNum,
            status: "submitted",
          };
          break;

 
        case "3A":
  user.progression.step3 = user.progression.step3 || {};
    // 🧩 Re-fillup logic if failed in Step 3 Part A
  if (user.progression.step3.partA?.status === "failed") {
    console.log("Re-fillup for Step 3 Part A");
    user.progression.step3.partA = {};
  }
  user.progression.step3.partA = {
    applicationId: appNum,
    status: "submitted",
  };

  // ✅ If both partA and partB exist, create overall Step 3 ID
  if (user.progression.step3.partA && user.progression.step3.partB) {
    const appNumOverall3 = await generateUniqueAppNumber();
    user.progression.step3.applicationId = appNumOverall3;
    user.progression.step3.overallStatus = "submitted";
  }
  break;

case "3B":
    // 🧩 Re-fillup logic if failed in Step 3 Part B
  if (user.progression.step3.partB?.status === "failed") {
    console.log("Re-fillup for Step 3 Part B");
    user.progression.step3.partB = {};
  }
  user.progression.step3 = user.progression.step3 || {};
  

  user.progression.step3.partB = {
    applicationId: appNum,
    status: "submitted",
  };

  // ✅ If both partA and partB exist, create overall Step 3 ID
  if (user.progression.step3.partA && user.progression.step3.partB) {
    const appNumOverall3 = await generateUniqueAppNumber();
    user.progression.step3.applicationId = appNumOverall3;
    user.progression.step3.overallStatus = "submitted";
  }
  break;

      }
    }

    // ✅ Save user progression
    await user.save();

    res.status(200).json({
      msg: "Payment verified and registration completed successfully",
      registrations,
    });

  } catch (err) {
    console.error("❌ Verification & registration error:", err);
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


//details thorugh steps 
export const getRegistrationById = async (req, res) => {
  try {
    const { registrationId } = req.params;

    // ✅ Check if it's a valid ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(registrationId);

    let registration = null;

    // ✅ Try finding by applicationNumber first (string like EXAM2025...)
    registration = await ExamRegistration.findOne({
      applicationNumber: registrationId,
    })
      .populate("userId", "name email")
      .populate("examId", "examName examCode");

    // ✅ If not found and the ID looks like a valid ObjectId, then search by _id
    if (!registration && isObjectId) {
      registration = await ExamRegistration.findById(registrationId)
        .populate("userId", "name email")
        .populate("examId", "examName examCode");
    }

    // ✅ Still not found
    if (!registration) {
      return res.status(404).json({ msg: "Registration not found" });
    }

    res.status(200).json({ msg: "Registration fetched", registration });
  } catch (err) {
    console.error("❌ getRegistrationById error:", err);
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



// ✅ getStepDetailsByApplicationId (Updated)
export const getStepDetailsByApplicationId = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ msg: "Application ID is required" });
    }

    console.log("🔹 Searching for user with applicationId:", applicationId);

    const user = await User.findOne({
      $or: [
        { "progression.step1.applicationId": applicationId },
        { "progression.step1.papers.paper1.applicationId": applicationId },
        { "progression.step1.papers.paper2.applicationId": applicationId },
        { "progression.step2.applicationId": applicationId },
        { "progression.step3.applicationId": applicationId },
        { "progression.step3.partA.applicationId": applicationId },
        { "progression.step3.partB.applicationId": applicationId },
      ],
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ msg: "No user found for this application ID" });
    }

    const progression = user.progression.toObject ? user.progression.toObject() : user.progression;

    // ✅ Step 1 overall
    if (progression.step1?.applicationId === applicationId) {
      console.log("✅ Step 1 overall application found");

      const paper1 =
        progression.step1?.papers?.paper1 && {
          name: "Paper 1",
          applicationId: progression.step1.papers.paper1.applicationId,
          status: progression.step1.papers.paper1.status || "not_started",
          completedDate: progression.step1.papers.paper1.completedDate || null,
        };

      const paper2 =
        progression.step1?.papers?.paper2 && {
          name: "Paper 2",
          applicationId: progression.step1.papers.paper2.applicationId,
          status: progression.step1.papers.paper2.status || "not_started",
          completedDate: progression.step1.papers.paper2.completedDate || null,
        };

      // ✅ Common eligibility message logic
      let message = "Step details fetched successfully";
      const step1Passed = progression.step1?.overallStatus === "passed";
      const step2Passed = progression.step2?.status === "passed";
      const step3APassed = progression.step3?.partA?.status === "passed";
      const step3BPassed = progression.step3?.partB?.status === "passed";

      if (step1Passed && step2Passed && step3APassed && step3BPassed) {
        message = "You have already cleared all steps";
      } else if (step1Passed && !step2Passed) {
        message = "You are eligible for Step 2";
      } else if (step2Passed && !step3APassed) {
        message = "You are eligible for Step 3A";
      } else if (step3APassed && !step3BPassed) {
        message = "You are eligible for Step 3B";
      }

      return res.status(200).json({
        msg: message,
        stepName: "Step 1",
        user: { name: user.name, email: user.email },
        applicationId,
        stepDetails: {
          status: progression.step1?.overallStatus || "in_progress",
          completedDate: progression.step1?.completedDate || null,
          papers: [paper1, paper2].filter(Boolean),
        },
        registration: step1Passed,
      });
    }

    // ✅ Step 3 overall
    if (progression.step3?.applicationId === applicationId) {
      console.log("✅ Step 3 overall application found");

      const step3 = {
        overallStatus: progression.step3?.overallStatus || "in_progress",
        completedDate: progression.step3?.completedDate || null,
        parts: [
          progression.step3?.partA
            ? {
                name: "Part A",
                applicationId: progression.step3.partA.applicationId,
                status: progression.step3.partA.status || "not_started",
                completedDate: progression.step3.partA.completedDate || null,
              }
            : null,
          progression.step3?.partB
            ? {
                name: "Part B",
                applicationId: progression.step3.partB.applicationId,
                status: progression.step3.partB.status || "not_started",
                completedDate: progression.step3.partB.completedDate || null,
              }
            : null,
        ].filter(Boolean),
      };

      // ✅ Common eligibility message logic (added here too)
      let message = "Step details fetched successfully";
      const step1Passed = progression.step1?.overallStatus === "passed";
      const step2Passed = progression.step2?.status === "passed";
      const step3APassed = progression.step3?.partA?.status === "passed";
      const step3BPassed = progression.step3?.partB?.status === "passed";

      if (step1Passed && step2Passed && step3APassed && step3BPassed) {
        message = "You have already cleared all steps";
      } else if (step1Passed && !step2Passed) {
        message = "You are eligible for Step 2";
      } else if (step2Passed && !step3APassed) {
        message = "You are eligible for Step 3A";
      } else if (step3APassed && !step3BPassed) {
        message = "You are eligible for Step 3B";
      }

      return res.status(200).json({
        msg: message,
        stepName: "Step 3",
        user: { name: user.name, email: user.email },
        applicationId,
        stepDetails: {
          status: step3.overallStatus,
          completedDate: step3.completedDate,
          parts: step3.parts,
        },
        registration: true,
      });
    }

    // 🔍 Recursive search for individual steps
    const findStep = (obj, parentKeys = []) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const val = obj[key];
          if (val && typeof val === "object") {
            if (val.applicationId === applicationId) {
              let name = "";
              if (parentKeys[0] === "step1" && parentKeys[1] === "papers") {
                name = key === "paper1" ? "Paper 1" : "Paper 2";
              } else if (parentKeys[0] === "step2") {
                name = "Step 2";
              } else if (parentKeys[0] === "step3") {
                name = parentKeys[1] === "partA" ? "Step 3A" : "Step 3B";
              } else {
                name = [...parentKeys, key].join(" - ");
              }
              return {
                stepGroup:
                  parentKeys[0] === "step1"
                    ? "Step 1"
                    : parentKeys[0] === "step3"
                    ? "Step 3"
                    : name,
                stepDetails: {
                  name,
                  applicationId: val.applicationId,
                  status: val.status || "not_started",
                  completedDate: val.completedDate || null,
                },
              };
            }
            const result = findStep(val, [...parentKeys, key]);
            if (result) return result;
          }
        }
      }
      return null;
    };

    const stepInfo = findStep(progression);

    if (!stepInfo) {
      return res.status(404).json({ msg: "Step not found for this application ID" });
    }

    console.log("✅ Step found:", stepInfo.stepDetails.name);

    const registration = stepInfo.stepDetails.status === "passed";

    // ✅ Common message logic for individual steps
    let message = "Step details fetched successfully";
    const step1Passed = progression.step1?.overallStatus === "passed";
    const step2Passed = progression.step2?.status === "passed";
    const step3APassed = progression.step3?.partA?.status === "passed";
    const step3BPassed = progression.step3?.partB?.status === "passed";

    if (step1Passed && step2Passed && step3APassed && step3BPassed) {
      message = "You have already cleared all steps";
    } else if (step1Passed && !step2Passed) {
      message = "You are eligible for Step 2";
    } else if (step2Passed && !step3APassed) {
      message = "You are eligible for Step 3A";
    } else if (step3APassed && !step3BPassed) {
      message = "You are eligible for Step 3B";
    }

    // ✅ Return individual step in array format
    return res.status(200).json({
      msg: message,
      stepName: stepInfo.stepGroup,
      user: { name: user.name, email: user.email },
      applicationId,
      stepDetails: {
        [stepInfo.stepGroup === "Step 1" ? "papers" : "parts"]: [stepInfo.stepDetails],
      },
      registration,
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


// export const getAdmitCard = async (req, res) => {
//   try {
//     const { applicationId } = req.params;
//     console.log("🔹 Searching for application:", applicationId);

//     const isObjectId = /^[0-9a-fA-F]{24}$/.test(applicationId);
//     let registration = await ExamRegistration.findOne({
//       applicationNumber: applicationId,
//     })
//       .populate("examId", "examName examCode")
//       .lean();

//     // If not found by applicationNumber, try _id
//     if (!registration && isObjectId) {
//       console.log("⚠️ Not found by applicationNumber, trying _id...");
//       registration = await ExamRegistration.findById(applicationId)
//         .populate("examId", "examName examCode")
//         .lean();
//     }

//     if (!registration) {
//       return res.status(404).json({ msg: "Application not found" });
//     }

//     // ✅ Fetch linked user
//     const userId = registration.userId;
//     if (!userId) {
//       return res
//         .status(404)
//         .json({ msg: "User not linked to this application" });
//     }

//     const user = await User.findById(userId)
//       .select(
//         "name gender email mobileNumber aadhaarNumber registerNo profile progression profileCompleted"
//       )
//       .lean();

//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     // ✅ Extract & filter progression related to this application
//     const prog = user.progression || {};
//     const filteredProgression = Object.entries(prog).reduce(
//       (acc, [key, value]) => {
//         if (
//           typeof value === "object" &&
//           value !== null &&
//           (
//             value.applicationId === applicationId ||
//             value.papers?.paper1?.applicationId === applicationId ||
//             value.papers?.paper2?.applicationId === applicationId ||
//             value.partA?.applicationId === applicationId ||
//             value.partB?.applicationId === applicationId
//           )
//         ) {
//           acc[key] = value;
//         }
//         return acc;
//       },
//       {}
//     );

//     // ✅ Clean user profile safely
//     const appProfile = user.profile?.application || {};
//     const cleanedProfile = {
//       fullName: appProfile.fullName || user.name || "",
//       dob: appProfile.dob || "",
//       gender: appProfile.gender || user.gender || "",
//       maritalStatus: appProfile.maritalStatus || "",
//       nationality: appProfile.nationality || "",
//       presentStatus: appProfile.presentStatus || "",
//       councilName: appProfile.councilName || "",
//       registrationNumber: appProfile.registrationNumber || "",
//       email: appProfile.email || user.email || "",
//       contactNumber: appProfile.contactNumber || user.mobileNumber || "",
//       altNumber: appProfile.altNumber || "",
//     };

//     // ✅ Extract exam details
//     const appInfo = registration.applicationInfo || {};
//     const centers = registration.centers || appInfo.centers || {};
//     const examName =
//       registration.examId?.examName || appInfo.examName || "N/A";
//     const examCode =
//       registration.examId?.examCode || appInfo.examCode || "N/A";

//     // ✅ Prepare admit card object
//     const admitCard = {
//       applicationNumber: registration.applicationNumber || null,
//       examName,
//       examCode,
//       examDate: appInfo.examDate || null,
//       reportingTime: appInfo.reportingTime || "08:30 AM",
//       gateClosingTime: appInfo.gateClosingTime || null,
//       examTimings: appInfo.timing || null,
//       centerName: [centers.center1, centers.center2, centers.center3, centers.center4, centers.center5, centers.center6, centers.center7, centers.center8, centers.center9].filter(Boolean),
//       venue: centers.venue || centers.address || null,
//       testCenterNumber: centers.testCenterNumber || null,
//       remarks: appInfo.remarks || null,

//       // ✅ User details
//       userId: user._id,
//       name: user.name,
//       mobileNumber: user.mobileNumber,
//       email: user.email,
//       registerNo: user.registerNo,
//       profileCompleted: user.profileCompleted,
//       progression: filteredProgression,

//       // ✅ Photo
//       photo:
//         user.profile?.documents?.photo?.url ||
//         appProfile.documents?.photo?.url ||
//         user.profile?.photo ||
//         null,

//       // ✅ Cleaned Profile
//       profile: cleanedProfile,
//     };

//     return res.status(200).json({
//       msg: "✅ Admit card data fetched successfully",
//       admitCard,
//     });
//   } catch (err) {
//     console.error("❌ getAdmitCard error:", err);
//     res.status(500).json({
//       msg: "Server error while fetching admit card",
//       error: err.message,
//     });
//   }
// };

export const getAdmitCard = async (req, res) => {
  try {
    const { applicationId } = req.params;
    console.log("🔹 Searching for admit card, applicationId:", applicationId);

    if (!applicationId) {
      return res.status(400).json({ msg: "Application ID is required" });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(applicationId);

    // 🔹 Step 1: Try to find registration by applicationNumber
    let registration = await ExamRegistration.findOne({
      applicationNumber: applicationId,
    })
      .populate("examId", "examName examCode")
      .lean();

    // 🔹 Step 2: Try by ObjectId if not found
    if (!registration && isObjectId) {
      registration = await ExamRegistration.findById(applicationId)
        .populate("examId", "examName examCode")
        .lean();
    }

    // 🔹 Step 3: Try to locate user directly from progression if registration not found
    let user;
    if (registration?.userId) {
      user = await User.findById(registration.userId)
        .select(
          "name gender email mobileNumber aadhaarNumber registerNo profile progression profileCompleted"
        )
        .lean();
    } else {
      console.log("⚠️ Registration not linked to user, finding by progression...");
      user = await User.findOne({
        $or: [
          { "progression.step1.applicationId": applicationId },
          { "progression.step1.papers.paper1.applicationId": applicationId },
          { "progression.step1.papers.paper2.applicationId": applicationId },
          { "progression.step2.applicationId": applicationId },
          { "progression.step3.applicationId": applicationId },
          { "progression.step3.partA.applicationId": applicationId },
          { "progression.step3.partB.applicationId": applicationId },
        ],
      })
        .select(
          "name gender email mobileNumber aadhaarNumber registerNo profile progression profileCompleted"
        )
        .lean();
    }

    if (!user) {
      return res.status(404).json({ msg: "No user found for this application ID" });
    }

    console.log("✅ User found:", user.name);

    // ✅ Normalize progression object
    const progression = user.progression?.toObject
      ? user.progression.toObject()
      : user.progression || {};

    let foundInStep = false;

    // ✅ Match applicationId inside step1/step3 or nested papers/parts
    const filteredProgression = Object.entries(progression).reduce(
      (acc, [key, value]) => {
        if (typeof value === "object" && value !== null) {
          const matches =
            value.applicationId === applicationId ||
            value.papers?.paper1?.applicationId === applicationId ||
            value.papers?.paper2?.applicationId === applicationId ||
            value.partA?.applicationId === applicationId ||
            value.partB?.applicationId === applicationId;

          if (matches) {
            acc[key] = value;
            foundInStep = true;
            console.log(`✅ Found match in progression → ${key}`);
          }
        }
        return acc;
      },
      {}
    );

    if (!foundInStep) {
      console.log("⚠️ No matching progression found for applicationId");
    }

    // ✅ Clean user profile safely
    const appProfile = user.profile?.application || {};
    const cleanedProfile = {
      fullName: appProfile.fullName || user.name || "",
      dob: appProfile.dob || "",
      gender: appProfile.gender || user.gender || "",
      maritalStatus: appProfile.maritalStatus || "",
      nationality: appProfile.nationality || "",
      presentStatus: appProfile.presentStatus || "",
      councilName: appProfile.councilName || "",
      registrationNumber: appProfile.registrationNumber || "",
      email: appProfile.email || user.email || "",
      contactNumber: appProfile.contactNumber || user.mobileNumber || "",
      altNumber: appProfile.altNumber || "",
    };

    // ✅ Extract exam details safely
    const appInfo = registration?.applicationInfo || {};
    const centers = registration?.centers || appInfo?.centers || {};
    const examName =
      registration?.examId?.examName || appInfo?.examName || "N/A";
    const examCode =
      registration?.examId?.examCode || appInfo?.examCode || "N/A";
//
  const DEFAULT_IMAGE =
      "https://res.cloudinary.com/dkocmwzhh/image/upload/v1762407097/0_kromzz.jpg";

    // ✅ Build admit card response
    const admitCard = {
      applicationNumber: registration?.applicationNumber || applicationId,
      examName,
      examCode,
      examDate: appInfo?.examDate || null,
      reportingTime: appInfo?.reportingTime || "08:30 AM",
      gateClosingTime: appInfo?.gateClosingTime || null,
      examTimings: appInfo?.timing || null,
      centerName: [
        centers.center1,
        centers.center2,
        centers.center3,
        centers.center4,
        centers.center5,
        centers.center6,
        centers.center7,
        centers.center8,
        centers.center9,
      ].filter(Boolean),
      venue: centers.venue || centers.address || null,
      testCenterNumber: centers.testCenterNumber || null,
      remarks: appInfo?.remarks || null,

      // ✅ User details
      userId: user._id,
      name: user.name,
      mobileNumber: user.mobileNumber,
      email: user.email,
      registerNo: user.registerNo,
      profileCompleted: user.profileCompleted,
      progression: filteredProgression,

      // ✅ Photo
      photo:
        user.profile?.documents?.photo?.url ||
        appProfile.documents?.photo?.url ||
        user.profile?.photo ||
        null,
  defaultImage: DEFAULT_IMAGE,
      // ✅ Cleaned Profile
      profile: cleanedProfile,
      
    };

    return res.status(200).json({
      msg: "✅ Admit card fetched successfully",
      admitCard,
    });
  } catch (err) {
    console.error("❌ getAdmitCard error:", err);
    res.status(500).json({
      msg: "Server error while fetching admit card",
      error: err.message,
    });
  }
};
