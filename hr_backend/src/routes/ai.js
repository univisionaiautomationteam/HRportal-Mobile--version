import express from "express";
import upload from "../middleware/s3Upload.js";

import {
  convertResumeFormatController,
  downloadFormattedResume,
  analyzeResumeForJD,
  getJDSuggestionsForResume,
  getInterviewTips,
  parseResumeController
} from "../controllers/aiController.js";

const router = express.Router();

// Use memory upload
router.post(
  "/convert-resume-format",
  upload.single("resume"),
  convertResumeFormatController
);

router.post(
  "/parse-resume",
  upload.single("resume"),
  parseResumeController
);

router.post("/generate-formatted-resume", downloadFormattedResume);
router.post("/analyze", analyzeResumeForJD);
router.post("/jd-suggestions", getJDSuggestionsForResume);
router.post("/interview-tips", getInterviewTips);

export default router;

// import express from 'express';
// import multer from 'multer';
// import {
//   convertResumeFormatController,
//   generateFormattedResumePDF,
//   analyzeResumeForJD,
//   getJDSuggestionsForResume,
//   getInterviewTips,
//   parseResumeController
// } from "../controllers/aiController.js";

// const router = express.Router();
// const upload = multer({ dest: 'uploads/' });


// // New route for resume format conversion
// router.post('/convert-resume-format', upload.single('resume'), convertResumeFormatController);
// router.post(
//   "/generate-formatted-resume",
//   generateFormattedResumePDF
// );
// router.post("/analyze", analyzeResumeForJD);
// router.post("/jd-suggestions", getJDSuggestionsForResume);
// router.post("/interview-tips", getInterviewTips);
// router.post('/parse-resume', upload.single('resume'), parseResumeController);


// export default router;
