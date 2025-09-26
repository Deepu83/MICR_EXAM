// utils/generateRegisterNo.js
import Counter from "../models/Counter.js";

export async function generateRegisterNo() {
  const year = new Date().getFullYear();
  const yy = String(year % 100).padStart(2, "0"); // last 2 digits

  // Atomic increment
  const counter = await Counter.findOneAndUpdate(
    { key: "registerNo" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const digits = String(counter.seq).padStart(4, "0"); // zero-padded
  return `${yy}MICR${digits}`;
}
