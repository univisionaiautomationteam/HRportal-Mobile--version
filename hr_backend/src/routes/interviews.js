
import express from 'express';
import {
  createInterview,
  getAllInterviews,
  getByCandidate,
  updateInterview,
  updateInterviewStatus,
  generateInterviewLink,
  getLiveInterviewSessions,
  getInterviewSessionDetails,
  getInterviewReport,
  cancelInterview
} from '../controllers/interviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create interview (auto-updates candidate status) - requires auth
router.post('/', protect, createInterview);

// List all interviews - requires auth
router.get('/', protect, getAllInterviews);

// Generate AI interview link for candidate - requires auth
router.post('/generate-link', protect, generateInterviewLink);

// Get live interview sessions for monitoring - requires auth
router.get('/live/sessions', protect, getLiveInterviewSessions);

// Get specific interview session details - requires auth
router.get('/live/:sessionId', protect, getInterviewSessionDetails);

// Get interview report - requires auth
router.get('/:sessionId/report', protect, getInterviewReport);

// Get interviews by candidate - requires auth
router.get('/candidate/:id', protect, getByCandidate);

// Update interview details (no status sync here) - requires auth
router.put('/:id', protect, updateInterview);

// Cancel interview and Teams meeting - requires auth
router.post('/:id/cancel', protect, cancelInterview);

// Update interview status (syncs candidate status) - requires auth
router.put('/:id/status', protect, updateInterviewStatus);

export default router;

// import express from 'express';
// import {
//   createInterview,
//   getByCandidate,
//   updateInterview,
//   getAllInterviews,
//   updateInterviewStatus
// } from '../controllers/interviewController.js';

// const router = express.Router();

// router.post('/', createInterview);
// router.get('/', getAllInterviews);
// router.get('/candidate/:id', getByCandidate);
// router.put('/:id', updateInterview);

// router.put('/:id/status', updateInterviewStatus);


// export default router;

// // import express from 'express';
// // import {
// //   createInterview,
// //   getByCandidate,
// //   updateInterview,
// //   getAllInterviews,
// //   getInterviewers,
// //   createInterviewer,
// //   deleteInterviewer,
// // } from '../controllers/interviewController.js';

// // const router = express.Router();

// // router.post('/', createInterview);
// // router.get('/candidate/:id', getByCandidate);
// // router.put('/:id', updateInterview);
// // router.get('/', getAllInterviews);

// // router.get('/', getInterviewers);
// // router.post('/', createInterviewer);
// // router.delete('/:id', deleteInterviewer);


// // export default router;
