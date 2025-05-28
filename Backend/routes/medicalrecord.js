// routes/medicalRecords.js
import express from 'express';
import { MedicalRecordsService } from '../controllers/medicalrecord.js';
import { authenticateToken } from '../middleware/authmiddleware.js';

const router = express.Router();

// POST - Save medical record after blockchain upload
router.post('/save-record', async (req, res) => {
  try {
    const { walletAddress, recordData } = req.body;
    
    console.log('Received save-record request:', {
      walletAddress,
      recordData: recordData ? 'Present' : 'Missing'
    });
    
    if (!walletAddress || !recordData) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address and record data are required'
      });
    }

    // Validate required fields in recordData
    const requiredFields = ['ipfsHash', 'reportType', 'fileName', 'fileSize', 'fileType', 'timestamp'];
    const missingFields = requiredFields.filter(field => !recordData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const result = await MedicalRecordsService.saveMedicalRecord(walletAddress, recordData);
    console.log('Medical record saved successfully:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in save-record route:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET - Get medical records for a specific wallet address
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    console.log('Fetching records for wallet:', walletAddress);
    
    const result = await MedicalRecordsService.getMedicalRecords(walletAddress);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST - Update user profile
router.post('/update-profile', async (req, res) => {
  try {
    const { walletAddress, profileData } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    const result = await MedicalRecordsService.updateUserProfile(walletAddress, profileData);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET - Get all patients (for doctor dashboard)
router.get('/patients', async (req, res) => {
  try {
    const result = await MedicalRecordsService.getAllPatients();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET - Get medical records by patient ID (for doctor viewing)
router.get('/patient/:userId/records', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await MedicalRecordsService.getMedicalRecordsByUserId(userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE - Delete a medical record
router.delete('/record/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    const result = await MedicalRecordsService.deleteMedicalRecord(walletAddress, recordId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET - Debug route to check if user exists
router.get('/debug/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const User = (await import('../models/User.js')).default;
    
    console.log('Debug: Checking for wallet address:', walletAddress);
    
    // Check with exact match
    const exactUser = await User.findOne({ walletAddress: walletAddress });
    
    // Check with case-insensitive match
    const caseInsensitiveUser = await User.findOne({ 
      walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') }
    });
    
    // Get all users for comparison
    const allUsers = await User.find({}, { walletAddress: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      searchedAddress: walletAddress,
      exactMatch: exactUser ? 'Found' : 'Not found',
      caseInsensitiveMatch: caseInsensitiveUser ? 'Found' : 'Not found',
      allWalletAddresses: allUsers.map(u => u.walletAddress),
      totalUsers: allUsers.length
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// Get medical records for a specific patient (Doctor access only)
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id; // From auth middleware

    // Verify the requesting user is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.usertype !== 'Doctor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only doctors can view patient records.' 
      });
    }

    // Find the patient
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Return the patient's medical records
    res.json({
      success: true,
      patient: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        walletAddress: patient.walletAddress
      },
      records: patient.medicalRecords || []
    });

  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching patient records' 
    });
  }
});


export default router;