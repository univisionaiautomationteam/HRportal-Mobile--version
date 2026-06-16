import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/s3Upload.js";

import {
  uploadResume,
  getResumeByCandidate,
  getResume,
  getAllResumeUpdates,
  downloadResume,
} from "../controllers/resumeController.js";

const router = express.Router();

// ======================= ROUTES =======================

// Upload resume → directly to S3
router.post(
  "/upload",
  protect,
  upload.single("resume"),
  uploadResume
);

// Get all resume updates
router.get("/all-updates", protect, getAllResumeUpdates);

// Download resume (via S3 logic)
router.get("/download/:id", protect, downloadResume);

// Get resume by candidate
router.get("/candidate/:candidateId", protect, getResumeByCandidate);

// Get single resume (keep last)
router.get("/:id", protect, getResume);

export default router;

// import express from 'express';
// import multer from 'multer';
// import { protect } from '../middleware/authMiddleware.js';
// import {
//   uploadResume,
//   getResumeByCandidate,
//   getResume,
//   getAllResumeUpdates,
// } from '../controllers/resumeController.js';
// import { downloadResume } from '../controllers/resumeController.js';

 
// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: 'uploads/resumes',
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowed = [
//     'application/pdf',
//     'application/msword',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//   ];

//   if (!allowed.includes(file.mimetype)) {
//     return cb(new Error('Only PDF/DOC/DOCX allowed'), false);
//   }
//   cb(null, true);
// };

// const upload = multer({ storage, fileFilter });

// // 🔥 UPDATED ROUTES
// // router.post('/upload', protect, upload.single('resume'), uploadResume);
// // router.get('/candidate/:candidateId', protect, getResumeByCandidate);
// // router.get('/all-updates', protect, getAllResumeUpdates);
// // router.get('/:id', protect, getResume);
// // router.get('/download/:id', protect, downloadResume);

// router.post('/upload', protect, upload.single('resume'), uploadResume);

// router.get('/all-updates', protect, getAllResumeUpdates);

// router.get('/download/:id', protect, downloadResume); // ✅ FIRST

// router.get('/candidate/:candidateId', protect, getResumeByCandidate);

// router.get('/:id', protect, getResume); // ❌ LAST

// export default router;

// // import express from 'express';
// // import multer from 'multer';
// // import {
// //   uploadResume,
// //   getResumeByCandidate,
// //   getResume,
// // } from '../controllers/resumeController.js';

// // const router = express.Router();

// // const storage = multer.diskStorage({
// //   destination: 'uploads/',
// //   filename: (req, file, cb) => {
// //     cb(null, Date.now() + '-' + file.originalname);
// //   },
// // });

// // const fileFilter = (req, file, cb) => {
// //   const allowed = [
// //     'application/pdf',
// //     'application/msword',
// //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
// //   ];

// //   if (!allowed.includes(file.mimetype)) {
// //     return cb(new Error('Only PDF/DOC/DOCX allowed'), false);
// //   }
// //   cb(null, true);
// // };

// // const upload = multer({ storage, fileFilter });

// // router.post('/upload', upload.single('resume'), uploadResume);
// // router.get('/candidate/:candidateId', getResumeByCandidate);
// // router.get('/:id', getResume);

// // export default router;

// // // import express from 'express';
// // // import multer from 'multer';
// // // import {
// // //   uploadResume,
// // //   getResumeByCandidate,
// // //   getResume,
// // // } from '../controllers/resumeController.js';

// // // const router = express.Router();

// // // const storage = multer.diskStorage({
// // //   destination: 'uploads/',
// // //   filename: (req, file, cb) => {
// // //     cb(null, Date.now() + '-' + file.originalname);
// // //   },
// // // });

// // // const fileFilter = (req, file, cb) => {
// // //   const allowed = [
// // //     'application/pdf',
// // //     'application/msword',
// // //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
// // //   ];

// // //   if (!allowed.includes(file.mimetype)) {
// // //     cb(new Error('Only PDF or DOCX files are allowed'), false);
// // //   } else {
// // //     cb(null, true);
// // //   }
// // // };

// // // const upload = multer({ storage, fileFilter });

// // // router.post('/upload', upload.single('resume'), uploadResume);
// // // router.get('/candidate/:candidateId', getResumeByCandidate);
// // // router.get('/:id', getResume);

// // // export default router;

// // // // import express from 'express';
// // // // import multer from 'multer';
// // // // import {
// // // //   uploadResume,
// // // //   getResumeByCandidate,
// // // //   getResume,
// // // // } from '../controllers/resumeController.js';

// // // // const router = express.Router();
// // // // const upload = multer({ dest: 'uploads/' });

// // // // router.post('/upload', upload.single('resume'), uploadResume);
// // // // router.get('/candidate/:candidateId', getResumeByCandidate);
// // // // router.get('/:id', getResume);

// // // // export default router;



// // // // const express = require('express');
// // // // const multer = require('multer');
// // // // const resumeController = require('../controllers/resumeController');

// // // // const router = express.Router();
// // // // const upload = multer({ storage: multer.memoryStorage() });

// // // // router.post('/upload', upload.single('resume'), resumeController.uploadResume);
// // // // router.get('/candidate/:candidateId', resumeController.getResumeByCandidate);
// // // // router.get('/:id', resumeController.getResume);

// // // // module.exports = router;
