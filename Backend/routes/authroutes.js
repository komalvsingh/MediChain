import express from 'express';
import {
  signup,
  signin,
  getUserProfile,
  getPatients,
  getDoctors,
  getDoctorByWallet,
  getPatientByWallet,
  authController,
} from '../controllers/authcontroller.js';
import { authenticateToken, authenticateTokenWithRole, protect } from '../middleware/authmiddleware.js';

const router = express.Router();

// Authentication routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', protect, getUserProfile);

// User listing routes
router.get('/patients', getPatients);
router.get('/doctors', getDoctors);

// NEW: Wallet address lookup routes (for access request functionality)
router.get('/doctors/wallet/:walletAddress', protect, getDoctorByWallet);
router.get('/patients/wallet/:walletAddress', protect, getPatientByWallet);

// Medical Reports Routes
router.post('/upload-report', authController.uploadReport);
router.get('/patient-reports/:patientAddress', authController.getPatientReports);

// Access Management Routes
router.post('/request-access', authController.requestAccess);
router.post('/approve-access', authController.approveAccess);

// Admin Routes
router.post('/grant-doctor-role', authController.grantDoctorRole);

export default router;