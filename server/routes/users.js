const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('managerId', 'name email department')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get team members (Manager and Admin)
router.get('/team', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { user } = req;
    let query = {};

    if (user.role === 'manager') {
      query = { managerId: user._id, isActive: true };
    } else if (user.role === 'admin') {
      query = { isActive: true };
    }

    const teamMembers = await User.find(query)
      .populate('managerId', 'name email department')
      .select('-password')
      .sort({ name: 1 });

    res.json({ teamMembers });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
});

// Get managers list (for user assignment)
router.get('/managers', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const managers = await User.find({ 
      role: { $in: ['manager', 'admin'] }, 
      isActive: true 
    })
    .select('name email department role')
    .sort({ name: 1 });

    res.json({ managers });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Failed to fetch managers' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    // Users can only view their own profile unless they're admin/manager
    if (user.role === 'employee' && user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const targetUser = await User.findById(id)
      .populate('managerId', 'name email department')
      .select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Managers can only view users in their department
    if (user.role === 'manager' && targetUser.department !== user.department && targetUser._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ user: targetUser });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('department').optional().trim().isLength({ min: 2 }).withMessage('Department is required'),
  body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('managerId').optional().isMongoId().withMessage('Invalid manager ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, department, role, managerId, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Validate manager assignment
    if (managerId && role === 'employee') {
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ message: 'Invalid manager ID' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department) updateData.department = department;
    if (role) updateData.role = role;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('managerId', 'name email department')
    .select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Deactivate user (Admin only)
router.patch('/:id/deactivate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Reactivate user (Admin only)
router.patch('/:id/activate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Failed to activate user' });
  }
});

// Get departments list
router.get('/departments/list', authenticateToken, async (req, res) => {
  try {
    const departments = await User.distinct('department', { isActive: true });
    res.json({ departments: departments.sort() });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

module.exports = router;