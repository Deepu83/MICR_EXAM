import express from "express";
import { register, login } from "../../controllers/admin/authController.js";
import { verifyToken } from "../../middleware/auth.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify", verifyToken, (req, res) => {
  res.json({ valid: true, userId: req.user.id });
});

export default router;
