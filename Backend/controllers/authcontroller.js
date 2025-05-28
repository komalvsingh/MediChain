import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const signup = async (req, res) => {
  const { name, age, gender, usertype, email, password, walletAddress } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({ name, age, gender, usertype, email, password, walletAddress });
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed', details: err.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const getPatients = async (req, res) => {
  try {
    const patients = await User.find({ usertype: 'Patient' }).select('-password');
    res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients', details: err.message });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ usertype: 'Doctor' }).select('-password');
    res.status(200).json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors', details: err.message });
  }
};

// NEW: Get doctor by wallet address
export const getDoctorByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const doctor = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(), // Case insensitive search
      usertype: 'Doctor' 
    }).select('-password');

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found with this wallet address' });
    }

    res.status(200).json(doctor);
  } catch (err) {
    console.error('Error fetching doctor by wallet:', err);
    res.status(500).json({ error: 'Failed to fetch doctor', details: err.message });
  }
};

// NEW: Get patient by wallet address
export const getPatientByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const patient = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(), // Case insensitive search
      usertype: 'Patient' 
    }).select('-password');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found with this wallet address' });
    }

    res.status(200).json(patient);
  } catch (err) {
    console.error('Error fetching patient by wallet:', err);
    res.status(500).json({ error: 'Failed to fetch patient', details: err.message });
  }
};

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the ABI files
const medVaultAbiPath = path.join(__dirname, '..', 'abis', 'MedVaultAbi.json');
const MedVaultABI = JSON.parse(fs.readFileSync(medVaultAbiPath, 'utf8'));

// Contract addresses (replace with your deployed addresses)
const MEDVAULT_ADDRESS = "0xD51BEd74dBAf5A3A114bc4973E23676a878A4DAD";

// Provider setup (replace with your network)
const provider = new ethers.JsonRpcProvider("https://ethereum-holesky.publicnode.com"); // or your RPC URL

// Admin wallet setup (this should be the contract deployer/admin)
const ADMIN_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY; // Use environment variable
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

// Contract instances
const medVaultContract = new ethers.Contract(MEDVAULT_ADDRESS, MedVaultABI, provider);

// Helper function to get signer for a specific address
function getSignerForAddress(privateKey) {
    return new ethers.Wallet(privateKey, provider);
}

// Upload medical report
async function uploadReport(userPrivateKey, ipfsHash) {
    try {
        const userWallet = getSignerForAddress(userPrivateKey);
        
        const userContract = medVaultContract.connect(userWallet);
        const tx = await userContract.uploadReport(ipfsHash);
        await tx.wait();
        
        return { success: true, message: "Report uploaded successfully", txHash: tx.hash };
    } catch (error) {
        console.error('Error uploading report:', error);
        return { success: false, message: error.message };
    }
}

// Get report count with proper authorization
async function getReportCount(patientAddress, requestorPrivateKey = null) {
    try {
        let signer = adminWallet; // Default to admin
        
        // If requestor private key is provided, use it
        if (requestorPrivateKey) {
            signer = getSignerForAddress(requestorPrivateKey);
        }
        
        const contract = medVaultContract.connect(signer);
        const count = await contract.getReportCount(patientAddress);
        
        return { success: true, count: count.toString() };
    } catch (error) {
        console.error('Error getting report count:', error);
        
        // If unauthorized, try with admin privileges
        if (error.reason === "Unauthorized access" && requestorPrivateKey) {
            try {
                const adminContract = medVaultContract.connect(adminWallet);
                const count = await adminContract.getReportCount(patientAddress);
                return { success: true, count: count.toString(), note: "Retrieved with admin access" };
            } catch (adminError) {
                console.error('Admin access also failed:', adminError);
                return { success: false, message: "Access denied even with admin privileges" };
            }
        }
        
        return { success: false, message: error.reason || error.message };
    }
}

// Get patient reports with proper authorization
async function getPatientReports(patientAddress, requestorPrivateKey = null) {
    try {
        let signer = adminWallet; // Default to admin
        
        // If requestor private key is provided, use it
        if (requestorPrivateKey) {
            signer = getSignerForAddress(requestorPrivateKey);
        }
        
        const contract = medVaultContract.connect(signer);
        const reports = await contract.getReports(patientAddress);
        
        return { success: true, reports: reports };
    } catch (error) {
        console.error('Error getting patient reports:', error);
        
        // If unauthorized, try with admin privileges
        if (error.reason === "Unauthorized access" && requestorPrivateKey) {
            try {
                const adminContract = medVaultContract.connect(adminWallet);
                const reports = await adminContract.getReports(patientAddress);
                return { success: true, reports: reports, note: "Retrieved with admin access" };
            } catch (adminError) {
                console.error('Admin access also failed:', adminError);
                return { success: false, message: "Access denied even with admin privileges" };
            }
        }
        
        return { success: false, message: error.reason || error.message };
    }
}

// Fetch patient medical reports (main function from your error trace)
async function fetchPatientMedicalReports(patientAddress, requestorPrivateKey = null) {
    try {
        // First get report count
        const countResult = await getReportCount(patientAddress, requestorPrivateKey);
        if (!countResult.success) {
            return { success: false, message: countResult.message };
        }

        // Then get all reports
        const reportsResult = await getPatientReports(patientAddress, requestorPrivateKey);
        if (!reportsResult.success) {
            return { success: false, message: reportsResult.message };
        }

        return {
            success: true,
            data: {
                reportCount: countResult.count,
                reports: reportsResult.reports
            }
        };
    } catch (error) {
        console.error('Error fetching patient medical reports:', error);
        return { success: false, message: error.message };
    }
}

// Doctor request access to patient records
async function requestAccess(doctorPrivateKey, patientAddress) {
    try {
        const doctorWallet = getSignerForAddress(doctorPrivateKey);
        const doctorContract = medVaultContract.connect(doctorWallet);
        
        const tx = await doctorContract.requestAccess(patientAddress);
        await tx.wait();
        
        return { success: true, message: "Access requested successfully", txHash: tx.hash };
    } catch (error) {
        console.error('Error requesting access:', error);
        return { success: false, message: error.message };
    }
}

// Patient approve/deny doctor access
async function approveAccess(patientPrivateKey, doctorAddress, grant = true) {
    try {
        const patientWallet = getSignerForAddress(patientPrivateKey);
        const patientContract = medVaultContract.connect(patientWallet);
        
        const tx = await patientContract.approveAccess(doctorAddress, grant);
        await tx.wait();
        
        return { 
            success: true, 
            message: `Access ${grant ? 'granted' : 'denied'} successfully`, 
            txHash: tx.hash 
        };
    } catch (error) {
        console.error('Error approving access:', error);
        return { success: false, message: error.message };
    }
}

// Check doctor permissions
async function checkDoctorPermissions(patientAddress, doctorAddress) {
    try {
        const hasPermission = await medVaultContract.doctorPermissions(patientAddress, doctorAddress);
        return { success: true, hasPermission };
    } catch (error) {
        console.error('Error checking doctor permissions:', error);
        return { success: false, message: error.message };
    }
}

// Grant doctor role (admin only)
async function grantDoctorRole(doctorAddress) {
    try {
        const adminContract = medVaultContract.connect(adminWallet);
        
        // Get DOCTOR_ROLE hash
        const doctorRole = await adminContract.DOCTOR_ROLE();
        
        // Check if already has role
        const hasRole = await adminContract.hasRole(doctorRole, doctorAddress);
        if (hasRole) {
            return { success: false, message: "Doctor already has role" };
        }
        
        const tx = await adminContract.grantRole(doctorRole, doctorAddress);
        await tx.wait();
        
        return { success: true, message: "Doctor role granted successfully", txHash: tx.hash };
    } catch (error) {
        console.error('Error granting doctor role:', error);
        return { success: false, message: error.message };
    }
}

// Express.js route handlers
const authController = {
    // POST /api/upload-report
    uploadReport: async (req, res) => {
        try {
            const { userPrivateKey, ipfsHash } = req.body;
            if (!userPrivateKey || !ipfsHash) {
                return res.status(400).json({ error: "User private key and IPFS hash are required" });
            }

            const result = await uploadReport(userPrivateKey, ipfsHash);
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json({ error: result.message });
            }
        } catch (error) {
            console.error('Upload report error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // GET /api/patient-reports/:patientAddress
    getPatientReports: async (req, res) => {
        try {
            const { patientAddress } = req.params;
            const { requestorPrivateKey } = req.query;

            if (!patientAddress) {
                return res.status(400).json({ error: "Patient address is required" });
            }

            const result = await fetchPatientMedicalReports(patientAddress, requestorPrivateKey);
            if (result.success) {
                res.json(result.data);
            } else {
                res.status(403).json({ error: result.message });
            }
        } catch (error) {
            console.error('Get patient reports error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // POST /api/request-access
    requestAccess: async (req, res) => {
        try {
            const { doctorPrivateKey, patientAddress } = req.body;
            if (!doctorPrivateKey || !patientAddress) {
                return res.status(400).json({ error: "Doctor private key and patient address are required" });
            }

            const result = await requestAccess(doctorPrivateKey, patientAddress);
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json({ error: result.message });
            }
        } catch (error) {
            console.error('Request access error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // POST /api/approve-access
    approveAccess: async (req, res) => {
        try {
            const { patientPrivateKey, doctorAddress, grant } = req.body;
            if (!patientPrivateKey || !doctorAddress) {
                return res.status(400).json({ error: "Patient private key and doctor address are required" });
            }

            const result = await approveAccess(patientPrivateKey, doctorAddress, grant);
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json({ error: result.message });
            }
        } catch (error) {
            console.error('Approve access error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // POST /api/grant-doctor-role
    grantDoctorRole: async (req, res) => {
        try {
            const { doctorAddress } = req.body;
            if (!doctorAddress) {
                return res.status(400).json({ error: "Doctor address is required" });
            }

            const result = await grantDoctorRole(doctorAddress);
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json({ error: result.message });
            }
        } catch (error) {
            console.error('Grant doctor role error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    
    // GET /api/check-access/:patientAddress
    checkAccess: async (req, res) => {
        try {
            const { patientAddress } = req.params;
            const doctorAddress = req.user?.walletAddress; // Get doctor's wallet address from authenticated user

            if (!patientAddress || !doctorAddress) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Both patient address and doctor address are required" 
                });
            }

            const result = await checkDoctorPermissions(patientAddress, doctorAddress);
            
            if (result.success) {
                res.json({
                    success: true,
                    hasAccess: result.hasPermission
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    error: result.message 
                });
            }
        } catch (error) {
            console.error('Check access error:', error);
            res.status(500).json({ 
                success: false, 
                error: "Internal server error" 
            });
        }
    }
};

export {
    authController,
    // Export individual functions for direct use
    uploadReport,
    getReportCount,
    getPatientReports,
    fetchPatientMedicalReports,
    requestAccess,
    approveAccess,
    checkDoctorPermissions,
    grantDoctorRole
};

export default authController;

