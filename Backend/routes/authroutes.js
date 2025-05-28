import express from 'express';
import {
  signup,
  signin,
  getUserProfile,
  getPatients,
  getDoctors,
 
} from '../controllers/authcontroller.js';
import { authenticateToken, authenticateTokenWithRole, protect } from '../middleware/authmiddleware.js';

const router = express.Router();

// Authentication routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', protect, getUserProfile);

router.get('/patients', getPatients); //
router.get('/doctors', getDoctors);

export default router;