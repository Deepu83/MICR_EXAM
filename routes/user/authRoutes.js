import express from "express";
import { register, login , updateProfile} from "../../controllers/user/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/update-profile/:userId", updateProfile);

export default router;
