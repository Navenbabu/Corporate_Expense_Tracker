const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/receipts';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Get all expenses (with filtering)
router.get('/', authenticateToken, [
  query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected', 'paid']),
  query('category').optional().isIn(['travel', 'meals', 'accommodation', 'equipment', 'office', 'other']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, category, startDate, endDate, page = 1, limit = 10 } = req.query;
    const { user } = req;

    // Build query based on user role
    let query = {};
    
    if (user.role === 'employee') {
      query.submittedBy = user._id;
    } else if (user.role === 'manager') {
      // Manager sees expenses from their department
      const teamMembers = await User.find({ 
        $or: [
          { managerId: user._id },
          { _id: user._id }
        ]
      }).select('_id');
      query.submittedBy = { $in: teamMembers.map(member => member._id) };
    }
    // Admin sees all expenses (no additional filter)

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const expenses = await Expense.find(query)
      .populate('submittedBy', 'name email department')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get single expense
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('submittedBy', 'name email department')
      .populate('reviewedBy', 'name email')
      .populate('comments.author', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check access permissions
    const { user } = req;
    const canAccess = 
      user.role === 'admin' ||
      expense.submittedBy._id.toString() === user._id.toString() ||
      (user.role === 'manager' && expense.submittedBy.department === user.department);

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

// Create new expense
router.post('/', authenticateToken, upload.single('receipt'), [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('category').isIn(['travel', 'meals', 'accommodation', 'equipment', 'office', 'other']),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('description').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, amount, currency, category, date } = req.body;

    const expenseData = {
      title,
      description: description || '',
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      category,
      date: new Date(date),
      submittedBy: req.user._id
    };

    // Handle receipt upload
    if (req.file) {
      expenseData.receiptUrl = `/uploads/receipts/${req.file.filename}`;
      expenseData.receiptFileName = req.file.originalname;
    }

    const expense = new Expense(expenseData);
    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email department');

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', authenticateToken, upload.single('receipt'), [
  body('title').optional().trim().isLength({ min: 3 }),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('category').optional().isIn(['travel', 'meals', 'accommodation', 'equipment', 'office', 'other']),
  body('date').optional().isISO8601(),
  body('description').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user can edit
    if (!expense.canEdit(req.user._id, req.user.role)) {
      return res.status(403).json({ message: 'Cannot edit expense in current status' });
    }

    const updateData = {};
    const { title, description, amount, currency, category, date } = req.body;

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount) updateData.amount = parseFloat(amount);
    if (currency) updateData.currency = currency.toUpperCase();
    if (category) updateData.category = category;
    if (date) updateData.date = new Date(date);

    // Handle receipt upload
    if (req.file) {
      updateData.receiptUrl = `/uploads/receipts/${req.file.filename}`;
      updateData.receiptFileName = req.file.originalname;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('submittedBy', 'name email department');

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// Submit expense for approval
router.patch('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user owns the expense
    if (expense.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be submitted' });
    }

    expense.status = 'submitted';
    expense.submittedAt = new Date();
    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email department');

    res.json({
      message: 'Expense submitted for approval',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({ message: 'Failed to submit expense' });
  }
});

// Approve/Reject expense
router.patch('/:id/review', authenticateToken, requireRole(['manager', 'admin']), [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('comment').optional().trim().isLength({ max: 500 }),
  body('paymentDetails').optional().isObject(),
  body('paymentDetails.method').optional().isIn(['upi', 'bank_transfer', 'salary_deduction', 'cash']),
  body('paymentDetails.timeline').optional().isIn(['immediate', '7_days', '14_days', 'next_salary'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id)
      .populate('submittedBy', 'name email department');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted expenses can be reviewed' });
    }

    // Check if manager can approve (department check)
    if (req.user.role === 'manager' && expense.submittedBy.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot review expenses from other departments' });
    }

    const { action, comment, paymentDetails } = req.body;

    expense.status = action === 'approve' ? 'approved' : 'rejected';
    expense.reviewedBy = req.user._id;
    expense.reviewedAt = new Date();

    if (paymentDetails && action === 'approve') {
      expense.paymentDetails = paymentDetails;
    }

    if (comment) {
      expense.comments.push({
        text: comment,
        author: req.user._id,
        createdAt: new Date()
      });
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email department')
      .populate('reviewedBy', 'name email')
      .populate('comments.author', 'name email');

    res.json({
      message: `Expense ${action}d successfully`,
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Review expense error:', error);
    res.status(500).json({ message: 'Failed to review expense' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user can delete
    const canDelete = 
      expense.submittedBy.toString() === req.user._id.toString() && expense.status === 'draft' ||
      req.user.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ message: 'Cannot delete expense in current status' });
    }

    // Delete receipt file if exists
    if (expense.receiptUrl) {
      const filePath = path.join(__dirname, '..', expense.receiptUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// Get expense statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    let matchQuery = {};

    if (user.role === 'employee') {
      matchQuery.submittedBy = user._id;
    } else if (user.role === 'manager') {
      const teamMembers = await User.find({ 
        $or: [{ managerId: user._id }, { _id: user._id }]
      }).select('_id');
      matchQuery.submittedBy = { $in: teamMembers.map(member => member._id) };
    }

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const categoryStats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      categoryStats: categoryStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

module.exports = router;