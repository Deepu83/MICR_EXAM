
import AdmZip from "adm-zip";
import Application from "../models/Application2.js";
import cloudinary from "../config/cloudinary.js";
import csv from "csvtojson";
import fs from "fs";




export const uploadApplicationZips = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "ZIP file is required" });
    }

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    let csvEntry = null;
    let fileMap = {};

    zipEntries.forEach((entry) => {
      const name = entry.entryName.toLowerCase();
      if (name.includes("__macosx") || name.includes("._")) return;

      if (name.endsWith(".csv")) csvEntry = entry;
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")) {
        fileMap[name.split("/").pop()] = entry;
      }
    });

    if (!csvEntry) {
      return res.status(400).json({ success: false, error: "CSV file missing in ZIP" });
    }

    const tempCsv = `./tmp_${Date.now()}.csv`;
    fs.writeFileSync(tempCsv, csvEntry.getData());
    const rows = await csv().fromFile(tempCsv);

    const uploadFromZip = async (entry) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream((err, result) => (err ? reject(err) : resolve(result.secure_url)))
          .end(entry.getData());
      });
    };

    // Use Promise.all to process all rows in parallel
    const savedRecords = await Promise.all(
      rows.map(async (row) => {
        let photoUrl = "";
        let signatureUrl = "";

        if (row.image && fileMap[row.image.toLowerCase().trim()]) {
          photoUrl = await uploadFromZip(fileMap[row.image.toLowerCase().trim()]);
        }
        if (row.signatureUrl && fileMap[row.signatureUrl.toLowerCase().trim()]) {
          signatureUrl = await uploadFromZip(fileMap[row.signatureUrl.toLowerCase().trim()]);
        }

        return Application.create({
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          email: row.email || "",
          gender: row.gender || "",
          phone: row.phone || "",
          dob: row.dob || "",
          username: row.username || "",
          registration_number: row.registration_number || row.registratio || "",
        //   password: row.password || "",
          center_name: row.center_name || row.center_na || "",
          city: row.city || "",
          centerId: row.centerId || "",
          date_of_exam: row.date_of_exam || "",
          description: row.description || "",
          reporting_time: row.reporting_time || "",
          gate_closing_time: row.gate_closing_time || "",
    
          paper_medium: row.paper_medium || "",
          course_name: row.course_name || "",
          venue_of_center: row.venue_of_center || "",
          Batch_Name:row.Batch_Name||"",
          photoUrl,
          signatureUrl,
        });
      })
    );

    // Cleanup
    fs.unlinkSync(tempCsv);
    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      message: "ZIP processed successfully",
      count: savedRecords.length,
      records: savedRecords,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message,
    });
  }
};

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
