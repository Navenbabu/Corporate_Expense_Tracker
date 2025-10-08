// server/routes/expenses.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Expense = require('../models/Expense');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/* =============================================================================
   Upload config
============================================================================= */

const RECEIPT_DIR = 'uploads/receipts';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(RECEIPT_DIR)) {
      fs.mkdirSync(RECEIPT_DIR, { recursive: true });
    }
    cb(null, RECEIPT_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
    const okMime = allowed.test(file.mimetype);
    if (okExt && okMime) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  },
});

const removeFileIfExists = (relativePath) => {
  if (!relativePath) return;
  const abs = path.join(process.cwd(), relativePath.replace(/^\//, ''));
  if (fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch {}
  }
};

/* =============================================================================
   Helpers
============================================================================= */

// Your model’s status supports: 'draft' | 'pending' | 'approved' | 'rejected'
// If you also want 'paid', add it to the model enum and leave it in this list.
const STATUS_ALLOWED = ['draft', 'pending', 'approved', 'rejected', 'paid'];

// Allow ANY non-empty category string (your model uses free text)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/** Role-aware scope:
 * - admin: everything
 * - manager: by department
 * - employee: own records
 */
const buildRoleScope = async (user) => {
  if (user.role === 'admin') return {};

  if (user.role === 'manager') {
    // You can scope by department OR by direct reports via managerId.
    // This version scopes by department using expense.user_department.
    return { user_department: user.department };
  }

  // employee
  return { user_id: user._id };
};

/* =============================================================================
   Validators
============================================================================= */

const listValidators = [
  query('status').optional().isString().custom((v) => STATUS_ALLOWED.includes(v)),
  query('category').optional().isString().custom(isNonEmptyString),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const createValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
  body('category').custom(isNonEmptyString).withMessage('Category is required'),
  body('description').optional().isString().isLength({ max: 1000 }),
  // status is optional; default 'draft' or 'pending' — we will force 'draft' on create
];

const updateValidators = [
  body('title').optional().trim().isLength({ min: 3 }),
  body('amount').optional().isFloat({ gt: 0 }),
  body('category').optional().custom(isNonEmptyString),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('status').optional().isString().custom((v) => STATUS_ALLOWED.includes(v)),
];

const commentValidators = [
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 chars'),
];

/* =============================================================================
   Routes
============================================================================= */

/**
 * GET /api/expenses
 * List expenses (role-aware), filters & pagination
 * Filters: status, category, startDate/endDate (uses createdAt)
 */
router.get('/', authenticateToken, listValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { status, category, startDate, endDate } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const scope = await buildRoleScope(req.user);
    const q = { ...scope };

    if (status) q.status = status;
    if (category) q.category = category;

    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate) q.createdAt.$lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(q)
        .populate('user_id', 'name email department') // so UI can show owner
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(q),
    ]);

    res.json({
      expenses,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit,
      },
    });
  } catch (e) {
    console.error('Get expenses error:', e);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

/**
 * GET /api/expenses/:id
 * Get a single expense (role-aware access)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('user_id', 'name email department');

    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const u = req.user;
    const canAccess =
      u.role === 'admin' ||
      expense.user_id?.toString() === u._id.toString() ||
      (u.role === 'manager' && expense.user_department === u.department);

    if (!canAccess) return res.status(403).json({ message: 'Access denied' });

    res.json({ expense });
  } catch (e) {
    console.error('Get expense error:', e);
    res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

/**
 * POST /api/expenses
 * Create expense (owner only)
 * - attaches user_id and user_department from JWT
 * - optional receipt upload (multipart/form-data with field "receipt")
 */
router.post('/', authenticateToken, upload.single('receipt'), createValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) removeFileIfExists(`${RECEIPT_DIR}/${req.file.filename}`);
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, amount, category } = req.body;

    const expenseData = {
      title,
      description: description || '',
      amount: parseFloat(amount),
      category,
      // Always start as draft; users submit later
      status: 'draft',
      user_id: req.user._id,
      user_department: req.user.department || 'general',
    };

    if (req.file) {
      expenseData.receipt_url = `/${RECEIPT_DIR}/${req.file.filename}`;
    }

    const expense = await Expense.create(expenseData);
    const populated = await Expense.findById(expense._id).populate('user_id', 'name email department');

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populated,
    });
  } catch (e) {
    console.error('Create expense error:', e);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update expense (only owner, only while draft)
 * - optional new receipt upload; deletes previous file
 */
router.put('/:id', authenticateToken, upload.single('receipt'), updateValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) removeFileIfExists(`${RECEIPT_DIR}/${req.file.filename}`);
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      if (req.file) removeFileIfExists(`${RECEIPT_DIR}/${req.file.filename}`);
      return res.status(404).json({ message: 'Expense not found' });
    }

    const isOwner = expense.user_id.toString() === req.user._id.toString();
    if (!(isOwner && expense.status === 'draft')) {
      if (req.file) removeFileIfExists(`${RECEIPT_DIR}/${req.file.filename}`);
      return res.status(403).json({ message: 'Cannot edit expense in current status' });
    }

    const { title, description, amount, category, status } = req.body;
    const update = {};

    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (amount !== undefined) update.amount = parseFloat(amount);
    if (category !== undefined) update.category = category;
    if (status !== undefined) update.status = status; // still enforced by draft check above

    if (req.file) {
      if (expense.receipt_url) removeFileIfExists(expense.receipt_url);
      update.receipt_url = `/${RECEIPT_DIR}/${req.file.filename}`;
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('user_id', 'name email department');

    res.json({ message: 'Expense updated successfully', expense: updated });
  } catch (e) {
    console.error('Update expense error:', e);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

/**
 * PATCH /api/expenses/:id/submit
 * Submit draft -> pending (owner only)
 */
router.patch('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('user_id', 'name email department');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.user_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be submitted' });
    }

    expense.status = 'pending';
    // Optional: if you add this to the model schema, it will persist:
    // expense.submitted_at = new Date();
    await expense.save();

    res.json({ message: 'Expense submitted for approval', expense });
  } catch (e) {
    console.error('Submit expense error:', e);
    res.status(500).json({ message: 'Failed to submit expense' });
  }
});

/**
 * PATCH /api/expenses/:id/review
 * Approve / Reject (manager/admin). Manager limited to their department.
 * Optional body: { action: 'approve' | 'reject', comment?: string }
 */
router.patch('/:id/review',
  authenticateToken,
  requireRole(['manager', 'admin']),
  [
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('comment').optional().isString().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const expense = await Expense.findById(req.params.id).populate('user_id', 'name email department');
      if (!expense) return res.status(404).json({ message: 'Expense not found' });

      if (expense.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending expenses can be reviewed' });
      }

      if (req.user.role === 'manager' && expense.user_department !== req.user.department) {
        return res.status(403).json({ message: 'Cannot review expenses from other departments' });
      }

      const { action, comment } = req.body;

      expense.status = action === 'approve' ? 'approved' : 'rejected';

      // Optional: if you add these to the model, they will persist:
      // expense.reviewed_by = req.user._id;
      // expense.reviewed_at = new Date();

      // Optional comments array in the model:
      // if (comment) {
      //   expense.comments = expense.comments || [];
      //   expense.comments.push({
      //     text: comment,
      //     author: req.user._id,
      //     created_at: new Date(),
      //   });
      // }

      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('user_id', 'name email department');

      res.json({ message: `Expense ${action}d successfully`, expense: populated });
    } catch (e) {
      console.error('Review expense error:', e);
      res.status(500).json({ message: 'Failed to review expense' });
    }
  }
);

/**
 * POST /api/expenses/:id/comments
 * Add a comment (owner, same-dept manager, or admin)
 * NOTE: requires you to add a `comments` array to the model to persist
 */
router.post('/:id/comments',
  authenticateToken,
  commentValidators,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const expense = await Expense.findById(req.params.id).populate('user_id', 'name email department');
      if (!expense) return res.status(404).json({ message: 'Expense not found' });

      const u = req.user;
      const canComment =
        u.role === 'admin' ||
        expense.user_id._id.toString() === u._id.toString() ||
        (u.role === 'manager' && expense.user_department === u.department);

      if (!canComment) return res.status(403).json({ message: 'Access denied' });

      // Persist only if your model has comments:
      // expense.comments = expense.comments || [];
      // expense.comments.push({ text: req.body.text, author: u._id, created_at: new Date() });
      await expense.save();

      // If you have comments populated:
      // const populated = await Expense.findById(expense._id)
      //   .populate('user_id', 'name email department')
      //   .populate('comments.author', 'name email');

      res.json({ message: 'Comment added', expense });
    } catch (e) {
      console.error('Add comment error:', e);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  }
);

/**
 * DELETE /api/expenses/:id/receipt
 * Remove uploaded receipt (owner while draft OR admin)
 */
router.delete('/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const isOwner = expense.user_id.toString() === req.user._id.toString();
    const canRemove = (isOwner && expense.status === 'draft') || req.user.role === 'admin';
    if (!canRemove) return res.status(403).json({ message: 'Not allowed to remove receipt' });

    if (expense.receipt_url) removeFileIfExists(expense.receipt_url);
    expense.receipt_url = '';
    await expense.save();

    res.json({ message: 'Receipt removed', expense });
  } catch (e) {
    console.error('Remove receipt error:', e);
    res.status(500).json({ message: 'Failed to remove receipt' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete expense (owner while draft OR admin)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const canDelete =
      (expense.user_id.toString() === req.user._id.toString() && expense.status === 'draft') ||
      req.user.role === 'admin';

    if (!canDelete) return res.status(403).json({ message: 'Cannot delete expense in current status' });

    if (expense.receipt_url) removeFileIfExists(expense.receipt_url);
    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (e) {
    console.error('Delete expense error:', e);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

/**
 * GET /api/expenses/stats/summary
 * Aggregates by status and category (role-aware)
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const match = await buildRoleScope(req.user);

    const [statusStats, categoryStats] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    // Useful flat totals for the dashboard cards
    const totals = statusStats.reduce(
      (acc, r) => {
        acc.totalExpenses += r.count || 0;
        acc.totalAmount += r.totalAmount || 0;
        if (r._id === 'pending') acc.pendingExpenses += r.count || 0;
        if (r._id === 'approved') {
          acc.approvedExpenses += r.count || 0;
          acc.approvedAmount += r.totalAmount || 0;
        }
        return acc;
      },
      { totalExpenses: 0, totalAmount: 0, pendingExpenses: 0, approvedExpenses: 0, approvedAmount: 0 }
    );

    res.json({
      ...totals,
      statusStats,
      categoryStats: categoryStats.map(c => ({
        name: c._id,
        value: c.totalAmount,
        count: c.count,
        // pick a deterministic color from name (optional)
        color: '#'+(c._id?.split('').reduce((a,ch)=> (a*33+ch.charCodeAt(0))>>>0,5381).toString(16)).slice(-6),
      })),
    });
  } catch (e) {
    console.error('Stats summary error:', e);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/expenses/stats/monthly
 * Monthly totals for charts (role-aware) using createdAt
 */
router.get('/stats/monthly', authenticateToken, async (req, res) => {
  try {
    const match = await buildRoleScope(req.user);

    const monthly = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          expenses: { $sum: '$amount' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] },  '$amount', 0] } },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);

    const out = monthly.map((r) => ({
      month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
      expenses: r.expenses,
      approved: r.approved,
      pending: r.pending,
    }));

    res.json(out);
  } catch (e) {
    console.error('Monthly stats error:', e);
    res.status(500).json({ message: 'Failed to fetch monthly stats' });
  }
});

module.exports = router;
