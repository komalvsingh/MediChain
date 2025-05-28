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
