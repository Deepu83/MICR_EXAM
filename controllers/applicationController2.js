
import AdmZip from "adm-zip";
import Application from "../models/Application2.js";
import cloudinary from "../config/cloudinary.js";
import csv from "csvtojson";
import fs from "fs";
import path from "path";



export const uploadApplicationZip = async (req, res) => {
  const DEBUG = true; // set false in production for speed
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "ZIP file is required" });
    }

    if (DEBUG) console.log("\n=== ZIP PROCESS START ===\n");

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    if (DEBUG) console.log("Total ZIP entries:", zipEntries.length);

    let csvEntry = null;
    const validExt = [".jpg", ".jpeg", ".png", ".jfif", ".jpe"];

    // single map: key -> entry
    const entryMap = new Map();

    const norm = (v) => String(v || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();

    // Build maps. For any entry, also create keys like "sg/filename" or "ig/filename"
    zipEntries.forEach((entry) => {
      if (entry.isDirectory) return;

      const raw = entry.entryName;
      const clean = norm(raw);
      if (!clean) return;
      if (clean.includes("__MACOSX") || clean.includes("/._")) return;

      if (clean.toLowerCase().endsWith(".csv")) {
        csvEntry = entry;
        if (DEBUG) console.log("CSV found:", clean);
        return;
      }

      const base = clean.split("/").pop();
      if (!base) return;

      const ext = path.extname(base).toLowerCase();
      if (!validExt.includes(ext)) return;

      const fullLower = clean.toLowerCase();          // full path lower
      const baseLower = base.toLowerCase();           // filename.ext
      const baseNoExtLower = baseLower.replace(ext, ""); // filename

      // always store: full, base.ext, baseNoExt
      entryMap.set(fullLower, entry);
      entryMap.set(baseLower, entry);
      entryMap.set(baseNoExtLower, entry);

      // If any folder segment equals 'sg' or 'ig', add sg/<file> and ig/<file>
      const segments = clean.split("/").map(s => s.toLowerCase());
      if (segments.includes("sg")) {
        entryMap.set(`sg/${baseLower}`, entry);
        entryMap.set(`sg/${baseNoExtLower}`, entry);
      }
      if (segments.includes("ig")) {
        entryMap.set(`ig/${baseLower}`, entry);
        entryMap.set(`ig/${baseNoExtLower}`, entry);
      }

      // Also add immediate parent folder + filename (useful for archive/... cases)
      if (segments.length >= 2) {
        const parent = segments[segments.length - 2];
        entryMap.set(`${parent}/${baseLower}`, entry);
        entryMap.set(`${parent}/${baseNoExtLower}`, entry);
      }

      if (DEBUG) {
        console.log("Stored:", {
          raw,
          fullLower,
          baseLower,
          baseNoExtLower,
          addedSG: segments.includes("sg"),
          addedIG: segments.includes("ig"),
          parent: segments.length >= 2 ? segments[segments.length - 2] : null,
        });
      }
    });

    if (!csvEntry) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ success: false, error: "CSV file missing in ZIP" });
    }

    const tempCsv = `./tmp_${Date.now()}.csv`;
    fs.writeFileSync(tempCsv, csvEntry.getData());
    const rows = await csv().fromFile(tempCsv);

    if (DEBUG) console.log("Total CSV rows:", rows.length);

    const uploadFromZip = async (entry) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: "image", format: "jpg" },
          (err, result) => (err ? reject(err) : resolve(result.secure_url))
        ).end(entry.getData());
      });

    const sanitize = (v) =>
      String(v || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\//, "")
        .replace(/^"(.*)"$/, "$1")
        .replace(/^'(.*)'$/, "$1");

    const findEntryForCsv = (raw) => {
      const value = sanitize(raw);
      if (!value) return null;

      const lower = value.toLowerCase();
      const base = lower.split("/").pop();
      const ext = path.extname(base);
      const baseNoExt = base.replace(ext, "");

      // candidate order: full given path, ig/..., sg/..., base.ext, baseNoExt, parent/<file>
      const candidates = [
        lower,
        `ig/${base}`,
        `sg/${base}`,
        base,
        baseNoExt,
        `ig/${baseNoExt}`,
        `sg/${baseNoExt}`,
      ];

      // also try appending common extensions if csv gave no ext
      if (!ext) {
        for (const e of validExt) {
          candidates.push(`${base}${e}`);
          candidates.push(`ig/${base}${e}`);
          candidates.push(`sg/${base}${e}`);
        }
      }

      if (DEBUG) {
        console.log("\nSearching CSV value:", raw);
        console.log("Sanitized ->", value);
        console.log("Candidates:", candidates.slice(0, 10));
      }

      for (const c of candidates) {
        if (!c) continue;
        const key = c.toLowerCase();
        if (entryMap.has(key)) {
          if (DEBUG) console.log("Matched key ->", key);
          return entryMap.get(key);
        }
      }

      if (DEBUG) console.log("No match for:", raw);
      return null;
    };

    const savedRecords = [];

    // process rows sequentially but upload photo+signature concurrently per row
    for (const row of rows) {
      if (DEBUG) console.log("\n=== PROCESSING ROW ===", row);

      const imageVal = row.image || row.photo || row.photoPath || "";
      const signatureVal = row.signature || row.sign || "";

      const photoEntry = findEntryForCsv(imageVal);
      const signEntry = findEntryForCsv(signatureVal);

      // run uploads concurrently for speed; only call uploadFromZip when entry exists
      const uploads = [];
      if (photoEntry) uploads.push(uploadFromZip(photoEntry)); else uploads.push(Promise.resolve(""));
      if (signEntry) uploads.push(uploadFromZip(signEntry)); else uploads.push(Promise.resolve(""));

      const [photoUrl, signatureUrl] = await Promise.all(uploads);

      if (DEBUG) {
        if (!photoEntry) console.warn("Photo missing for CSV:", imageVal);
        if (!signEntry) console.warn("Signature missing for CSV:", signatureVal);
      }

      const nameParts = (row.name || "").trim().split(/\s+/);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ") || "";

      const record = await Application.create({
        first_name: firstName,
        last_name: lastName,
        email: row.email || "",
        gender: row.gender || "",
        phone: row.phone || "",
        reporting_time:row.Reporting_Timing||"",
       Exam_Timing:row.Exam_time||"",
       End_time:row.End_time ||"",
       Batch_Name:row.Batch||"",
        dob: row.dob || "",
        username: row.username || "",
        registration_number: row.registration_number || "",
        photoUrl,
        signatureUrl,
      });

      savedRecords.push(record);
    }

    try { fs.unlinkSync(tempCsv); } catch (e) {}
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    return res.json({
      success: true,
      message: "ZIP processed successfully",
      count: savedRecords.length,
      records: savedRecords,
    });
  } catch (error) {
    console.error("ERROR:", error);
    try { if (req?.file?.path) fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(500).json({ success: false, error: error.message });
  }
};


// export const uploadApplicationZips = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, error: "ZIP file is required" });
//     }

//     const zip = new AdmZip(req.file.path);
//     const zipEntries = zip.getEntries();

//     let csvEntry = null;
//     let fileMap = {};

//     zipEntries.forEach((entry) => {
//       const name = entry.entryName.toLowerCase();
//       if (name.includes("__macosx") || name.includes("._")) return;

//       if (name.endsWith(".csv")) csvEntry = entry;
//       else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")) {
//         fileMap[name.split("/").pop()] = entry;
//       }
//     });

//     if (!csvEntry) {
//       return res.status(400).json({ success: false, error: "CSV file missing in ZIP" });
//     }

//     const tempCsv = `./tmp_${Date.now()}.csv`;
//     fs.writeFileSync(tempCsv, csvEntry.getData());
//     const rows = await csv().fromFile(tempCsv);

//     const uploadFromZip = async (entry) => {
//       return new Promise((resolve, reject) => {
//         cloudinary.uploader
//           .upload_stream((err, result) => (err ? reject(err) : resolve(result.secure_url)))
//           .end(entry.getData());
//       });
//     };

//     // Use Promise.all to process all rows in parallel
//     const savedRecords = await Promise.all(
//       rows.map(async (row) => {
//         let photoUrl = "";
//         let signatureUrl = "";

//         if (row.image && fileMap[row.image.toLowerCase().trim()]) {
//           photoUrl = await uploadFromZip(fileMap[row.image.toLowerCase().trim()]);
//         }
//         if (row.signatureUrl && fileMap[row.signatureUrl.toLowerCase().trim()]) {
//           signatureUrl = await uploadFromZip(fileMap[row.signatureUrl.toLowerCase().trim()]);
//         }

//         return Application.create({
//           first_name: row.first_name || "",
//           last_name: row.last_name || "",
//           email: row.email || "",
//           gender: row.gender || "",
//           phone: row.phone || "",
//           dob: row.dob || "",
//           username: row.username || "",
//           registration_number: row.registration_number || row.registratio || "",
//         //   password: row.password || "",
//           center_name: row.center_name || row.center_na || "",
//           city: row.city || "",
//           centerId: row.centerId || "",
//           date_of_exam: row.date_of_exam || "",
//           description: row.description || "",
//           reporting_time: row.reporting_time || "",
//           gate_closing_time: row.gate_closing_time || "",
    
//           paper_medium: row.paper_medium || "",
//           course_name: row.course_name || "",
//           venue_of_center: row.venue_of_center || "",
//           Batch_Name:row.Batch_Name||"",
//           photoUrl,
//           signatureUrl,
//         });
//       })
//     );

//     // Cleanup
//     fs.unlinkSync(tempCsv);
//     fs.unlinkSync(req.file.path);

//     return res.json({
//       success: true,
//       message: "ZIP processed successfully",
//       count: savedRecords.length,
//       records: savedRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Server error",
//       details: error.message,
//     });
//   }
// };

// --------------------------------------------------
// 📌 GET APPLICATION BY (username OR centerId OR registration_no)
// --------------------------------------------------


export const getApplicationByUsernames = async (req, res) => {
  try {
    const applicationNumber = req.params.applicationNumber?.trim();

    if (!applicationNumber) {
      return res.status(400).json({ success: false, error: "Application Number parameter is required" });
    }

    // Search by username because it stores the application number
    const record = await Application.findOne({
      username: { $regex: `^${applicationNumber}$`, $options: "i" }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: "No record found for this Application Number" });
    }

    // Build candidate name
    const candidateName = `${record.first_name || ""} ${record.last_name || ""}`.trim();

    // Convert record → plain object
    const obj = record.toObject();

    // Remove first and last name
    delete obj.first_name;
    delete obj.last_name;

    // Replace username with application_number
    obj.application_number = obj.username;
    delete obj.username;

    // Add candidate name
    obj.candicate_name = candidateName;

    return res.json({
      success: true,
      data: obj
    });

  } catch (error) {
    console.error("Error fetching application by Application Number:", error);
    return res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};
