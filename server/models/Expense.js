const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    // ---------------- Core Details ----------------
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },

    // Optional category with safe default
    category: {
      type: String,
      trim: true,
      default: 'other',
    },

    // Expense status lifecycle
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },

    // Receipt URL (for uploaded file)
    receipt_url: {
      type: String,
      default: '',
    },

    // ---------------- Ownership & Scoping ----------------
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // auto-assigned from JWT
      index: true,
    },
    user_department: {
      type: String,
      trim: true,
      index: true,
    },

    // ---------------- Optional Metadata ----------------
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    // Expense entry date
    date: {
      type: Date,
      default: Date.now,
    },

    // ---------------- Review Workflow ----------------
    // Who reviewed this expense (manager/admin)
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // When it was reviewed
    reviewed_at: {
      type: Date,
      default: null,
    },

    // When user submitted (for tracking approval workflow)
    submitted_at: {
      type: Date,
      default: null,
    },

    // ---------------- Comments (for review discussion) ----------------
    comments: [
      {
        text: {
          type: String,
          required: true,
          maxlength: 500,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Helpful indexes
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdAt: -1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ user_department: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
