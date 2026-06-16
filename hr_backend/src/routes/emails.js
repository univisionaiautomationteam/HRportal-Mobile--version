import express from 'express';
import multer from "multer";
import {
  sendInterviewEmail,
  sendOfferEmail,
  // getEmailLogs,
} from '../controllers/emailController.js';
import { protect } from '../middleware/authMiddleware.js';
const upload = multer();
const router = express.Router();

router.post('/interview', protect, sendInterviewEmail);
// router.post('/offer', sendOfferEmail);
router.post(
  "/offer",
  protect,
  upload.none(),  // 👈 THIS IS IMPORTANT
  sendOfferEmail
);
// router.get('/logs', getEmailLogs);

export default router;
