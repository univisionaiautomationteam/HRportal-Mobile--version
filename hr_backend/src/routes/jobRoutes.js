import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireHrManager } from '../middleware/hrManagerMiddleware.js';
import { getJobs, createJob, deleteJob } from '../controllers/jobController.js';

const router = express.Router();

router.get('/', protect, getJobs);
router.post('/', protect, requireHrManager, createJob);
router.delete('/:id', protect, requireHrManager, deleteJob);

export default router; 
