// Add these routes to your existing routes file

import express from 'express';
import { 
  
  fetchMedicalReports,
  signup,
  signin, 
  getUserProfile,
  getPatients,
  getDoctors,
  fetchPatientMedicalReports,
  getSpecificReport,
  checkUserHealthID,
  authController,
  
} from '../controllers/authcontroller.js';
import { authenticateToken, authenticateTokenWithRole, protect } from '../middleware/authmiddleware.js'; // Your existing auth middleware

const router = express.Router();

// Existing routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', protect, getUserProfile);
router.get('/patients', getPatients); 
router.get('/doctors', getDoctors);



// Medical Reports Routes
router.post('/upload-report', authController.uploadReport);
router.get('/patient-reports/:patientAddress', authController.getPatientReports);

// Access Management Routes
router.post('/request-access', authController.requestAccess);
router.post('/approve-access', authController.approveAccess);

// Admin Routes
router.post('/grant-doctor-role', authController.grantDoctorRole);



export default router;

