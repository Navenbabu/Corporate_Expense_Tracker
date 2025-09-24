const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Expense = require('../models/Expense');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_tracker');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Expense.deleteMany({});
    console.log('Cleared existing data');

    // Create categories
    const categories = [
      {
        name: 'travel',
        displayName: 'Travel',
        description: 'Transportation, flights, taxi, fuel expenses',
        icon: 'plane'
      },
      {
        name: 'meals',
        displayName: 'Meals & Entertainment',
        description: 'Business meals, client entertainment',
        icon: 'utensils'
      },
      {
        name: 'accommodation',
        displayName: 'Accommodation',
        description: 'Hotel stays, lodging expenses',
        icon: 'bed'
      },
      {
        name: 'equipment',
        displayName: 'Equipment',
        description: 'Office equipment, software, hardware',
        icon: 'laptop'
      },
      {
        name: 'office',
        displayName: 'Office Supplies',
        description: 'Stationery, office materials, utilities',
        icon: 'briefcase'
      },
      {
        name: 'other',
        displayName: 'Other',
        description: 'Miscellaneous business expenses',
        icon: 'receipt'
      }
    ];

    await Category.insertMany(categories);
    console.log('Created categories');

    // Create users
    const salt = await bcrypt.genSalt(12);

    // Create admin
    const admin = new User({
      name: 'Admin User',
      email: 'admin@company.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      department: 'IT',
      isActive: true
    });
    await admin.save();

    // Create manager
    const manager = new User({
      name: 'Manager User',
      email: 'manager@company.com',
      password: await bcrypt.hash('manager123', salt),
      role: 'manager',
      department: 'Sales',
      isActive: true
    });
    await manager.save();

    // Create employees
    const employee1 = new User({
      name: 'Employee User',
      email: 'employee@company.com',
      password: await bcrypt.hash('employee123', salt),
      role: 'employee',
      department: 'Sales',
      managerId: manager._id,
      isActive: true
    });
    await employee1.save();

    const employee2 = new User({
      name: 'John Doe',
      email: 'john.doe@company.com',
      password: await bcrypt.hash('john123', salt),
      role: 'employee',
      department: 'Sales',
      managerId: manager._id,
      isActive: true
    });
    await employee2.save();

    const employee3 = new User({
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      password: await bcrypt.hash('jane123', salt),
      role: 'employee',
      department: 'Marketing',
      isActive: true
    });
    await employee3.save();

    console.log('Created users');

    // Create sample expenses
    const sampleExpenses = [
      {
        title: 'Client Meeting Lunch',
        description: 'Business lunch with potential client',
        amount: 85.50,
        currency: 'USD',
        category: 'meals',
        date: new Date('2024-01-15'),
        status: 'approved',
        submittedBy: employee1._id,
        reviewedBy: manager._id,
        submittedAt: new Date('2024-01-15'),
        reviewedAt: new Date('2024-01-16'),
        paymentDetails: {
          method: 'bank_transfer',
          timeline: '7_days'
        }
      },
      {
        title: 'Conference Travel',
        description: 'Flight tickets for industry conference',
        amount: 450.00,
        currency: 'USD',
        category: 'travel',
        date: new Date('2024-01-20'),
        status: 'submitted',
        submittedBy: employee2._id,
        submittedAt: new Date('2024-01-20')
      },
      {
        title: 'Office Supplies',
        description: 'Stationery and printing materials',
        amount: 25.75,
        currency: 'USD',
        category: 'office',
        date: new Date('2024-01-22'),
        status: 'draft',
        submittedBy: employee1._id
      },
      {
        title: 'Hotel Stay - Business Trip',
        description: '2 nights hotel accommodation',
        amount: 320.00,
        currency: 'USD',
        category: 'accommodation',
        date: new Date('2024-01-18'),
        status: 'rejected',
        submittedBy: employee3._id,
        reviewedBy: admin._id,
        submittedAt: new Date('2024-01-18'),
        reviewedAt: new Date('2024-01-19'),
        comments: [{
          text: 'Hotel rate exceeds company policy. Please provide alternative options.',
          author: admin._id,
          createdAt: new Date('2024-01-19')
        }]
      }
    ];

    await Expense.insertMany(sampleExpenses);
    console.log('Created sample expenses');

    console.log('\n=== SEED DATA COMPLETED ===');
    console.log('Demo Accounts Created:');
    console.log('Admin: admin@company.com / admin123');
    console.log('Manager: manager@company.com / manager123');
    console.log('Employee: employee@company.com / employee123');
    console.log('Employee: john.doe@company.com / john123');
    console.log('Employee: jane.smith@company.com / jane123');
    console.log('\nDatabase seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Seed data error:', error);
    process.exit(1);
  }
};

// Run the seed function
if (require.main === module) {
  seedData();
}

module.exports = seedData;