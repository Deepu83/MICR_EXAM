// import express from "express";
// import { register, login } from "../../controllers/admin/authController.js";
// import { verifyToken } from "../../middleware/auth.js";
// const router = express.Router();

// router.post("/register", register);
// router.post("/login", login);
// router.get("/verify", verifyToken, (req, res) => {
//   res.json({ valid: true, userId: req.user.id });
// });

// export default router;
import express from "express";
import { register, login } from "../../controllers/admin/authController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// Register admin
router.post("/register", register);

// Login admin
router.post("/login", login);

// Verify token route
router.get("/verify", verifyToken, (req, res) => {
// Ensure req.user exists
if (!req.user || !req.user.id) {
return res.status(401).json({ valid: false, msg: "Unauthorized" });
}

res.status(200).json({
valid: true,
userId: req.user.id,
});
});

export default router;
