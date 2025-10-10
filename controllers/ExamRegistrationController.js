import ExamRegistration from "../models/ExamRegistration.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRegistration = async (req, res) => {
  try {
    const {
      userId,
      examId,
      examDate,
      paymentAmount,
      examCode,
      currency,
      paymentMode,
      country,
      remarks,
    } = req.body;

    // ✅ Validate required fields
    if (!userId || !examId || !examDate || !paymentAmount || !examCode) {
      return res
        .status(400)
        .json({ msg: "All required fields must be provided" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Check if user already registered for this exam
    let registration = await ExamRegistration.findOne({ userId, examId });

    if (!registration) {
      // ✅ Generate EXAM2025-394 pattern
      const currentYear = new Date().getFullYear();
      let applicationNumber;
      let isUnique = false;

      while (!isUnique) {
        const randomDigits = Math.floor(100 + Math.random() * 900);
        applicationNumber = `EXAM${currentYear}-${randomDigits}`;
        const existing = await ExamRegistration.findOne({ applicationNumber });
        if (!existing) isUnique = true;
      }

      // ✅ Step 1: Create Razorpay Order
      const orderOptions = {
        amount: paymentAmount * 100, // amount in paise
        currency: currency || "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(orderOptions);

      // ✅ Step 2: Save registration with order details
      registration = new ExamRegistration({
        applicationNumber,
        userId: new mongoose.Types.ObjectId(userId),
        examId: new mongoose.Types.ObjectId(examId),
        applicationInfo: {
          examDate,
          paymentAmount,
          currency: currency || "INR",
          paymentMode: paymentMode || "Razorpay",
          transactionId: order.id, // store Razorpay order ID
          country: country || "India",
          remarks: remarks || "",
          paymentStatus: "unpaid",
        },
      });

      await registration.save();
    }

    // ✅ Step 3: Update user progression
    user.progression = user.progression || {};

    switch (examCode) {
      case "1":
        user.progression.step1 = user.progression.step1 || {};
        user.progression.step1.papers = user.progression.step1.papers || {};
        user.progression.step1.papers.paper1 = user.progression.step1.papers.paper1 || {};
        user.progression.step1.papers.paper2 = user.progression.step1.papers.paper2 || {};
        user.progression.step1.papers.paper1.applicationId = registration.applicationNumber;
        user.progression.step1.papers.paper2.applicationId = registration.applicationNumber;
        break;

      case "2":
        user.progression.step2 = user.progression.step2 || {};
        user.progression.step2.applicationId = registration.applicationNumber;
        break;

      case "3A":
        user.progression.step3 = user.progression.step3 || {};
        user.progression.step3.partA = user.progression.step3.partA || {};
        user.progression.step3.partA.applicationId = registration.applicationNumber;
        break;

      case "3B":
        user.progression.step3 = user.progression.step3 || {};
        user.progression.step3.partB = user.progression.step3.partB || {};
        user.progression.step3.partB.applicationId = registration.applicationNumber;
        break;

      default:
        return res.status(400).json({ msg: "Invalid examCode" });
    }

    await user.save();

    // ✅ Step 4: Send order info back to frontend
    res.status(200).json({
      msg: "Exam registration created successfully",
      registration,
      examCode,
      razorpayOrder: {
        orderId: registration.applicationInfo.transactionId,
        amount: registration.applicationInfo.paymentAmount * 100,
        currency: registration.applicationInfo.currency,
        key: process.env.RAZORPAY_KEY_ID, // send key to frontend for Razorpay checkout
      },
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


//varify the payment 
export const verifyPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const sign = order_id + "|" + payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== signature) {
      return res.status(400).json({ msg: "Invalid payment signature" });
    }

    // ✅ Update registration payment info
    await ExamRegistration.findOneAndUpdate(
      { "applicationInfo.transactionId": order_id },
      {
        $set: {
          "applicationInfo.paymentStatus": "paid",
          "applicationInfo.paymentDate": new Date(),
          "applicationInfo.transactionId": payment_id, // replace order ID with payment ID
        },
      }
    );

    res.status(200).json({ msg: "Payment verified successfully" });
  } catch (err) {
    console.error("❌ Verification Error:", err);
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




// ✅ Get step details by applicationId
export const getStepDetailsByApplicationId = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ msg: "Application ID is required" });
    }

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
      return res.status(404).json({ msg: "No user found for this application ID" });
    }

    let stepDetails = {};
    let stepName = "";

    // ✅ Identify which step the applicationId belongs to
    const p = user.progression;

    if (p.step1?.papers?.paper1?.applicationId === applicationId) {
      stepName = "Step 1 - Paper 1";
      stepDetails = p.step1.papers.paper1;
    } else if (p.step1?.papers?.paper2?.applicationId === applicationId) {
      stepName = "Step 1 - Paper 2";
      stepDetails = p.step1.papers.paper2;
    } else if (p.step2?.applicationId === applicationId) {
      stepName = "Step 2";
      stepDetails = p.step2;
    } else if (p.step3?.partA?.applicationId === applicationId) {
      stepName = "Step 3A";
      stepDetails = p.step3.partA;
    } else if (p.step3?.partB?.applicationId === applicationId) {
      stepName = "Step 3B";
      stepDetails = p.step3.partB;
    }

    // ✅ Find registration info from ExamRegistration model
    const registration = await ExamRegistration.findOne({ applicationNumber: applicationId })
      .populate("examId", "examName examCode")
      .populate("userId", "name email");

    res.status(200).json({
      msg: "Step details fetched successfully",
      stepName,
      user: { name: user.name, email: user.email },
      applicationId,
      stepDetails: {
        status: stepDetails.status || "not_started",
        completedDate: stepDetails.completedDate || null,
      },
      registration,
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
