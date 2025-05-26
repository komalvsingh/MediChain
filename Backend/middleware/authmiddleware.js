import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Not authorized, token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access token is required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token - user not found' 
      });
    }

    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        message: 'Token expired' 
      });
    }
    
    return res.status(500).json({ 
      message: 'Server error during authentication' 
    });
  }
};

// Alternative version if you want to check for specific user types
export const authenticateTokenWithRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          message: 'Access token is required' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid token - user not found' 
        });
      }

      // Check user role if roles are specified
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.usertype)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions' 
        });
      }

      req.user = user;
      next();
      
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          message: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          message: 'Token expired' 
        });
      }
      
      return res.status(500).json({ 
        message: 'Server error during authentication' 
      });
    }
  };
};

// Usage example for role-based authentication:
// router.get('/admin-only', authenticateTokenWithRole(['admin']), (req, res) => {
//   res.json({ message: 'Admin access granted' });
// });