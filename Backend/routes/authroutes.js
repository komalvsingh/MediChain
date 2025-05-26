import express from 'express';
import { signup, signin, getUserProfile } from '../controllers/authcontroller.js';
import { protect } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', protect, getUserProfile);

export default router;
