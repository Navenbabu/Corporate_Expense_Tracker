const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ========================
// REGISTER USER
// ========================
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('department').notEmpty(),
  body('role').isIn(['employee', 'manager', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { name, email, password, department, role, managerId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ name, email, password, department, role, managerId });
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// ========================
// LOGIN
// ========================
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ========================
// DEMO ACCOUNTS (RESTORED)
// ========================
router.get('/demo-accounts', async (req, res) => {
  try {
    const demoAccounts = [
      {
        email: 'admin@company.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User',
        department: 'IT'
      },
      {
        email: 'manager@company.com',
        password: 'manager123',
        role: 'manager',
        name: 'Manager User',
        department: 'Sales'
      },
      {
        email: 'employee@company.com',
        password: 'employee123',
        role: 'employee',
        name: 'Employee User',
        department: 'Sales'
      }
    ];

    res.json({
      message: 'Demo accounts available',
      accounts: demoAccounts
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get demo accounts' });
  }
});

// ========================
// PROFILE (AUTH REQUIRED)
// ========================
router.get('/profile', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// ========================
// LOGOUT
// ========================
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
