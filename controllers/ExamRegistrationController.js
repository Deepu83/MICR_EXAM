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
    const existingReg = await ExamRegistration.findOne({ userId, examId });
    if (existingReg) {
      return res.status(400).json({ msg: "User already registered for this exam" });
    }

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
          user.progression.step2 = {
            applicationId: appNum,
            status: "submitted",
          };
          break;

 
        case "3A":
  user.progression.step3 = user.progression.step3 || {};
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


export const getStepDetailsByApplicationId = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ msg: "Application ID is required" });
    }

    console.log("🔹 Searching for user with applicationId:", applicationId);

    // ✅ Find the user whose progression contains this applicationId
    const user = await User.findOne({
      $or: [
        { "progression.step1.papers.paper1.applicationId": applicationId },
        { "progression.step1.papers.paper2.applicationId": applicationId },
        { "progression.step2.applicationId": applicationId },
        { "progression.step3.partA.applicationId": applicationId },
        { "progression.step3.partB.applicationId": applicationId },
      ],
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ msg: "No user found for this application ID" });
    }

    console.log("✅ User found:", user.name, user.email);

    const progression = user.progression.toObject ? user.progression.toObject() : user.progression;

    // Recursive search function
    const findStep = (obj, parentKeys = []) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const val = obj[key];
          if (val && typeof val === "object") {
            if (val.applicationId === applicationId) {
              let stepName = "";
              if (parentKeys[0] === "step1") {
                stepName = "Step 1 - " + (parentKeys[1] === "papers" ? (key === "paper1" ? "Paper 1" : "Paper 2") : key);
              } else if (parentKeys[0] === "step2") {
                stepName = "Step 2";
              } else if (parentKeys[0] === "step3") {
                stepName = parentKeys[1] === "partA" ? "Step 3A" : "Step 3B";
              } else {
                stepName = [...parentKeys, key].join(" - ");
              }
              return { stepName, stepDetails: val };
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
      console.log("❌ Step not found in progression");
      return res.status(404).json({ msg: "Step not found for this application ID" });
    }

    console.log("✅ Step found:", stepInfo.stepName, stepInfo.stepDetails.status);

    // ✅ Set registration true automatically if status is 'passed'
    const registration = stepInfo.stepDetails.status === "passed" ? true : null;

    res.status(200).json({
      msg: "Step details fetched successfully",
      stepName: stepInfo.stepName,
      user: { name: user.name, email: user.email },
      applicationId,
      stepDetails: {
        status: stepInfo.stepDetails.status || "not_started",
        completedDate: stepInfo.stepDetails.completedDate || null,
      },
      registration,
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export const getAdmitCard = async (req, res) => {
  try {
    const { applicationId } = req.params;
    console.log("🔹 Searching for application:", applicationId);

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(applicationId);

    // ✅ Use let to allow reassignment
    let registration = await ExamRegistration.findOne({
      applicationNumber: applicationId,
    })
      .populate("examId", "examName examCode")
      .lean();

    if (!registration && isObjectId) {
      console.log("⚠️ Not found by applicationNumber, trying _id...");
      registration = await ExamRegistration.findById(applicationId)
        .populate("examId", "examName examCode")
        .lean();
    }

    if (!registration) {
      return res.status(404).json({ msg: "Application not found" });
    }


    const userId = registration.userId;
    if (!userId) {
      return res.status(404).json({ msg: "User not linked to this application" });
    }

    // ✅ Find user safely
    const user = await User.findById(userId)
      .select(
        "name gender email mobileNumber aadhaarNumber registerNo profile progression profileCompleted"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // ✅ Filter progression data
    const prog = user.progression || {};
    const filteredProgression = {};

    for (const [key, value] of Object.entries(prog)) {
      if (
        typeof value === "object" &&
        value !== null &&
        (
          value.applicationId === applicationId ||
          value.papers?.paper1?.applicationId === applicationId ||
          value.papers?.paper2?.applicationId === applicationId ||
          value.partA?.applicationId === applicationId ||
          value.partB?.applicationId === applicationId
        )
      ) {
        filteredProgression[key] = value;
      }
    }

    // ✅ Clean up user profile
    const app = user.profile?.application || {};
    const cleanedProfile = {
      fullName: app.fullName || "",
      dob: app.dob || "",
      gender: app.gender || "",
      maritalStatus: app.maritalStatus || "",
      nationality: app.nationality || "",
      presentStatus: app.presentStatus || "",
      councilName: app.councilName || "",
      registrationNumber: app.registrationNumber || "",
      email: app.email || "",
      contactNumber: app.contactNumber || "",
      altNumber: app.altNumber || "",
    };

    // ✅ Extract exam details safely
    const appInfo = registration.applicationInfo || {};
    const centers = registration.centers || appInfo.centers || {};
    const examName = registration.examId?.examName || appInfo.examName || "";
    const examCode = registration.examId?.examCode || appInfo.examCode || "";

    // ✅ Prepare admit card data
    const admitCard = {
      applicationNumber: registration.applicationNumber || null,
      examName,
      examCode,
      examDate: appInfo.examDate || null,
      reportingTime: appInfo.reportingTime || "08:30 AM",
      gateClosingTime: appInfo.gateClosingTime || null,
      examTimings: appInfo.timing || null,
      centerName: [centers.center1, centers.center2].filter(Boolean),
      venue: centers.venue || centers.address || null,
      testCenterNumber: centers.testCenterNumber || null,
      remarks: appInfo.remarks || null,

      // ✅ Include user details
      userId: user._id,
      name: user.name,
      mobileNumber: user.mobileNumber,
      email: user.email,
      registerNo: user.registerNo,
      profileCompleted: user.profileCompleted,
      progression: filteredProgression,
      photo:
        user.profile?.documents?.photo?.url ||
        app.documents?.photo?.url ||
        user.profile?.photo ||
        null,
      profile: cleanedProfile,
    };

    res.status(200).json({
      msg: "Admit card data fetched successfully",
      admitCard,
    });
  } catch (err) {
    console.error("❌ getAdmitCard error:", err);
    res.status(500).json({
      msg: "Server error",
      error: err.message,
    });
  }
};
