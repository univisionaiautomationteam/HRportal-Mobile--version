import express from "express";
import {
  googleLogin,
  verifyOTP,
  getMyProfile,
  microsoftLogin
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";




const router = express.Router();

router.post("/google-login", googleLogin);
router.post("/verify-otp", verifyOTP);
router.get("/me",protect, getMyProfile);
router.post("/microsoft-login", microsoftLogin);



export default router;
