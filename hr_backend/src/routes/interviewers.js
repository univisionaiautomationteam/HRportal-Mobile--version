import express from 'express';
import {
  getInterviewers,
  createInterviewer,
  deleteInterviewer
} from '../controllers/interviewerController.js';

const router = express.Router();

router.get('/', getInterviewers);
router.post('/', createInterviewer);
router.delete('/:id', deleteInterviewer);

export default router;
