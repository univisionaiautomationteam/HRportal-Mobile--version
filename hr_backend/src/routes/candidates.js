import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { requireHrManager } from '../middleware/hrManagerMiddleware.js';
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  getRemarks,
  addRemark,
  updateRemark,
  getEligibleCandidates
} from '../controllers/candidateController.js';

const router = express.Router();
const upload = multer();

router.post('/', protect, upload.none(), createCandidate);
router.get('/', protect, getCandidates);
router.get('/:id', protect, getCandidateById);
router.put('/:id', protect, upload.none(), updateCandidate);
router.delete('/:id', protect, requireHrManager , deleteCandidate);
router.get('/eligible', protect, getEligibleCandidates); // NEW endpoint for eligible candidates

/* ================= REMARKS (TIMELINE) ================= */
router.get('/:candidateId/remarks', protect, getRemarks);
router.post('/:candidateId/remarks', protect, addRemark);
router.put('/:candidateId/remarks/:remarkId', protect, updateRemark);

export default router;

// import express from 'express';
// import multer from 'multer';
// import { protect } from '../middleware/authMiddleware.js';
// import {
//   createCandidate,
//   getCandidates,
//   getCandidateById,
//   updateCandidate,
//   deleteCandidate,
// } from '../controllers/candidateController.js';

// const router = express.Router();
// const upload = multer(); // memory parser ONLY

// // ================= CREATE =================
// // HR must be logged in
// router.post('/', protect, upload.none(), createCandidate);

// // ================= LIST =================
// // List can be public to logged-in users
// router.get('/', protect, getCandidates);

// // ================= DETAIL =================
// router.get('/:id', protect, getCandidateById);

// // ================= UPDATE =================
// router.put('/:id', protect, upload.none(), updateCandidate);

// // ================= DELETE =================
// router.delete('/:id', protect, deleteCandidate);

// export default router;

// // import express from 'express';
// // import multer from 'multer';
// // import { authMiddleware } from '../middleware/authMiddleware.js';
// // import {
// //   createCandidate,
// //   getCandidates,
// //   getCandidateById,
// //   updateCandidate,
// //   deleteCandidate,
// // } from '../controllers/candidateController.js';

// // const router = express.Router();
// // const upload = multer(); // memory parser ONLY

// // router.post('/', upload.none(), createCandidate);
// // router.get('/', getCandidates);
// // router.get('/:id', getCandidateById);
// // router.delete('/:id', authMiddleware, deleteCandidate);
// // router.put('/:id', authMiddleware, upload.none(), updateCandidate);

// // export default router;

// // import express from 'express';
// // import multer from 'multer';
// // import {
// //   createCandidate,
// //   getCandidates,
// //   getCandidateById,
// //   updateCandidate,
// //   deleteCandidate,
// // } from '../controllers/candidateController.js';

// // const router = express.Router();
// // const upload = multer(); // 🔥 REQUIRED

// // router.post('/', upload.none(), createCandidate); // 🔥 IMPORTANT
// // router.get('/', getCandidates);
// // router.get('/:id', getCandidateById);
// // router.put('/:id', upload.none(), updateCandidate);
// // router.delete('/:id', deleteCandidate);

// // export default router;
