// routes/profileRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getStatusActivity } from "../controllers/profileController.js";

const router = express.Router();

router.get("/status-activity", protect, getStatusActivity);

export default router;
