import express from "express";
import {
  getWorkflowEmails,
  saveWorkflowEmails
} from "../controllers/workflowEmailController.js";

import { protect } from "../middleware/authMiddleware.js";
import { requireHrManager } from "../middleware/hrManagerMiddleware.js";

const router = express.Router();

/* GET ALL EMAILS */

router.get("/", protect, getWorkflowEmails);

/* SAVE EMAILS (ADMIN ONLY) */

router.post("/", protect, requireHrManager, saveWorkflowEmails);

export default router;
