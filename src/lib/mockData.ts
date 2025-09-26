// Mock data for the expense tracker application

export interface Expense {
  _id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  receiptUrl?: string;
  submittedBy: {
    _id: string;
    name: string;
    email: string;
    department: string;
    role: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Initialize expenses from localStorage or use defaults
const getStoredExpenses = (): Expense[] => {
  try {
    const stored = localStorage.getItem('expenses');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading stored expenses:', error);
  }
  
  // Return default expenses if none stored - all amounts in Indian Rupees
  return [
    {
      _id: '1',
      title: 'Business Lunch with Client',
      description: 'Lunch meeting with potential client to discuss project requirements',
      amount: 2500,
      currency: '₹',
      category: 'meals',
      date: '2024-01-15T00:00:00.000Z',
      status: 'approved',
      receiptUrl: 'https://example.com/receipt1.jpg',
      submittedBy: {
        _id: '3',
        name: 'Employee User',
        email: 'employee@company.com',
        department: 'Sales',
        role: 'employee',
      },
      approvedBy: {
        _id: '2',
        name: 'Manager User',
        email: 'manager@company.com',
      },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-16T14:30:00.000Z',
    },
    {
      _id: '2',
      title: 'Flight to Mumbai',
      description: 'Round trip flight for client presentation',
      amount: 15000,
      currency: '₹',
      category: 'travel',
      date: '2024-01-10T00:00:00.000Z',
      status: 'paid',
      submittedBy: {
        _id: '3',
        name: 'Employee User',
        email: 'employee@company.com',
        department: 'Sales',
        role: 'employee',
      },
      approvedBy: {
        _id: '2',
        name: 'Manager User',
        email: 'manager@company.com',
      },
      createdAt: '2024-01-10T09:00:00.000Z',
      updatedAt: '2024-01-12T16:45:00.000Z',
    },
    {
      _id: '3',
      title: 'Hotel Stay - Delhi',
      description: '3 nights accommodation for conference',
      amount: 8500,
      currency: '₹',
      category: 'accommodation',
      date: '2024-01-08T00:00:00.000Z',
      status: 'submitted',
      submittedBy: {
        _id: '4',
        name: 'Sarah Johnson',
        email: 'sarah.j@company.com',
        department: 'Marketing',
        role: 'employee',
      },
      createdAt: '2024-01-08T11:20:00.000Z',
      updatedAt: '2024-01-08T11:20:00.000Z',
    },
    {
      _id: '4',
      title: 'Office Supplies',
      description: 'Stationery and printing materials for Q1',
      amount: 3200,
      currency: '₹',
      category: 'office',
      date: '2024-01-05T00:00:00.000Z',
      status: 'draft',
      submittedBy: {
        _id: '5',
        name: 'Mike Chen',
        email: 'mike.c@company.com',
        department: 'Engineering',
        role: 'manager',
      },
      createdAt: '2024-01-05T13:15:00.000Z',
      updatedAt: '2024-01-05T13:15:00.000Z',
    },
    {
      _id: '5',
      title: 'Taxi Fare - Airport',
      description: 'Transportation from office to airport for business trip',
      amount: 850,
      currency: '₹',
      category: 'travel',
      date: '2024-01-12T00:00:00.000Z',
      status: 'approved',
      submittedBy: {
        _id: '3',
        name: 'Employee User',
        email: 'employee@company.com',
        department: 'Sales',
        role: 'employee',
      },
      approvedBy: {
        _id: '2',
        name: 'Manager User',
        email: 'manager@company.com',
      },
      createdAt: '2024-01-12T08:30:00.000Z',
      updatedAt: '2024-01-12T16:45:00.000Z',
    },
  ];
};

// Save expenses to localStorage
export const saveExpensesToStorage = (expenses: Expense[]): void => {
  try {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving expenses to storage:', error);
  }
};

// Get expenses from storage
export const getExpensesFromStorage = (): Expense[] => {
  return getStoredExpenses();
};

// Initialize and export expenses
export let mockExpenses = getStoredExpenses();

// Update mockExpenses and save to storage
export const updateMockExpenses = (expenses: Expense[]): void => {
  mockExpenses = expenses;
  saveExpensesToStorage(expenses);
};

// Format currency in Indian Rupee format
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const mockExpenseStats = {
  totalExpenses: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0,
  totalAmount: 0,
  monthlySpend: 0,
};

export const mockCategories = [
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'meals', name: 'Meals & Entertainment', icon: '🍽️' },
  { id: 'accommodation', name: 'Accommodation', icon: '🏨' },
  { id: 'equipment', name: 'Equipment', icon: '💻' },
  { id: 'office', name: 'Office Supplies', icon: '📋' },
  { id: 'other', name: 'Other', icon: '📄' },
];