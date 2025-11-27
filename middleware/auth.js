// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ msg: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; // attach user id to req
    next();

  } catch (err) {
    console.error("Token Error:", err.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};
