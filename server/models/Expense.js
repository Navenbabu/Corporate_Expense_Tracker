const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['travel', 'meals', 'accommodation', 'equipment', 'office', 'other']
  },
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'paid'],
    default: 'draft'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiptUrl: {
    type: String,
    default: ''
  },
  receiptFileName: {
    type: String,
    default: ''
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['upi', 'bank_transfer', 'salary_deduction', 'cash'],
      default: null
    },
    timeline: {
      type: String,
      enum: ['immediate', '7_days', '14_days', 'next_salary'],
      default: null
    },
    accountDetails: {
      type: String,
      default: ''
    }
  },
  comments: [{
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
expenseSchema.index({ submittedBy: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ reviewedBy: 1 });
expenseSchema.index({ 'submittedBy': 1, 'status': 1 });

// Middleware to update timestamps on status changes
expenseSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'submitted' && !this.submittedAt) {
      this.submittedAt = new Date();
    }
    if ((this.status === 'approved' || this.status === 'rejected') && !this.reviewedAt) {
      this.reviewedAt = new Date();
    }
  }
  next();
});

// Virtual for expense age in days
expenseSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to get expenses by department
expenseSchema.statics.getByDepartment = async function(department, status = null) {
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'submittedBy',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $match: {
        'employee.department': department,
        ...(status && { status })
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Instance method to check if user can edit
expenseSchema.methods.canEdit = function(userId, userRole) {
  // Only the creator can edit, and only in draft status
  return this.submittedBy.toString() === userId.toString() && this.status === 'draft';
};

// Instance method to check if user can approve
expenseSchema.methods.canApprove = function(userId, userRole, userDepartment) {
  if (this.status !== 'submitted') return false;
  if (userRole === 'admin') return true;
  if (userRole === 'manager') {
    // Manager can approve expenses from their department
    return true; // Will be validated with department check in route
  }
  return false;
};

module.exports = mongoose.model('Expense', expenseSchema);