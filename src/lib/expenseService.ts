import { User, Expense } from './supabase';

// Role-based expense filtering service
export class ExpenseService {
  // Get expenses based on user role and department
  static getExpensesByRole(currentUser: User, allExpenses: Expense[]): Expense[] {
    if (currentUser.role === 'admin') {
      // Admin can see all expenses
      return allExpenses;
    } else if (currentUser.role === 'manager') {
      // Manager can see expenses from their department only
      return allExpenses.filter(expense => 
        expense.user_department === currentUser.department || 
        expense.user_id === currentUser.id
      );
    } else {
      // Employee can only see their own expenses
      return allExpenses.filter(expense => expense.user_id === currentUser.id);
    }
  }

  // Get team members based on user role
  static getTeamMembersByRole(currentUser: User, allUsers: User[]): User[] {
    if (currentUser.role === 'admin') {
      // Admin can see all users
      return allUsers;
    } else if (currentUser.role === 'manager') {
      // Manager can see users in their department only
      return allUsers.filter(user => 
        user.department === currentUser.department || 
        user.id === currentUser.id
      );
    } else {
      // Employee can only see themselves
      return allUsers.filter(user => user.id === currentUser.id);
    }
  }

  // Generate role-based mock expenses with proper user associations
  static generateRoleBasedExpenses(currentUser: User, allUsers: User[]): Expense[] {
    const baseExpenses: Omit<Expense, 'id' | 'user_id' | 'user_department'>[] = [
      {
        title: 'Business Lunch',
        description: 'Client meeting lunch',
        amount: 45.50,
        category: 'Meals',
        status: 'pending',
        receipt_url: '',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Office Supplies',
        description: 'Printer paper and pens',
        amount: 120.00,
        category: 'Office Supplies',
        status: 'approved',
        receipt_url: '',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Travel Expenses',
        description: 'Flight to conference',
        amount: 350.00,
        category: 'Travel',
        status: 'draft',
        receipt_url: '',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Software License',
        description: 'Annual subscription',
        amount: 299.99,
        category: 'Software',
        status: 'approved',
        receipt_url: '',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Training Course',
        description: 'Professional development',
        amount: 450.00,
        category: 'Training',
        status: 'approved',
        receipt_url: '',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Create expenses for different users based on role
    const expenses: (Expense & { user_department: string })[] = [];
    let expenseId = 1;

    // Get relevant users based on current user's role
    const relevantUsers = this.getTeamMembersByRole(currentUser, allUsers);

    relevantUsers.forEach(user => {
      baseExpenses.forEach(baseExpense => {
        expenses.push({
          ...baseExpense,
          id: `${expenseId++}`,
          user_id: user.id,
          user_department: user.department,
          title: `${baseExpense.title} - ${user.name}`,
          amount: baseExpense.amount + Math.random() * 50 // Add some variation
        });
      });
    });

    return expenses;
  }

  // Get dashboard statistics based on role
  static getDashboardStats(currentUser: User, expenses: Expense[]) {
    const userExpenses = this.getExpensesByRole(currentUser, expenses);
    
    return {
      totalExpenses: userExpenses.length,
      totalAmount: userExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      pendingExpenses: userExpenses.filter(e => e.status === 'pending').length,
      approvedExpenses: userExpenses.filter(e => e.status === 'approved').length,
      rejectedExpenses: userExpenses.filter(e => e.status === 'rejected').length,
      draftExpenses: userExpenses.filter(e => e.status === 'draft').length,
      approvedAmount: userExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
      recentExpenses: userExpenses.slice(0, 5)
    };
  }

  // Get category data for charts based on role
  static getCategoryData(currentUser: User, expenses: Expense[]) {
    const userExpenses = this.getExpensesByRole(currentUser, expenses);
    
    const categoryTotals = userExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      if (!acc[category]) {
        acc[category] = { name: category, value: 0, count: 0 };
      }
      acc[category].value += expense.amount;
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

    return Object.values(categoryTotals).map((item, index) => ({
      ...item,
      color: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'][index % 5]
    }));
  }

  // Get monthly trend data based on role
  static getMonthlyData(currentUser: User, expenses: Expense[]) {
    const userExpenses = this.getExpensesByRole(currentUser, expenses);
    
    const monthlyTotals = userExpenses.reduce((acc, expense) => {
      const month = new Date(expense.created_at).toLocaleDateString('en-US', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { month, expenses: 0, approved: 0, pending: 0 };
      }
      acc[month].expenses += expense.amount;
      if (expense.status === 'approved') {
        acc[month].approved += expense.amount;
      } else if (expense.status === 'pending') {
        acc[month].pending += expense.amount;
      }
      return acc;
    }, {} as Record<string, { month: string; expenses: number; approved: number; pending: number }>);

    return Object.values(monthlyTotals);
  }
}