import { createClient } from '@supabase/supabase-js';

// Supabase configuration - fallback to localStorage for demo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  receipt_url?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  user_department?: string; // Added for role-based filtering
}

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

// Check if we have real Supabase credentials
const hasRealSupabaseCredentials = () => {
  return supabaseUrl !== 'https://demo.supabase.co' && 
         supabaseAnonKey !== 'demo-key' &&
         supabaseUrl.includes('supabase.co');
};

// Get users from localStorage or initialize with your real database users
const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem('app_users');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored users:', error);
  }
  
  // Return your actual database users as fallback
  return [
    {
      id: '06a89ad2-0154-48a1-8cef-22c4159ff74b',
      email: 'rolex@funmail.com',
      name: 'Rolex',
      role: 'manager',
      department: 'Operations',
      password_hash: 'Password123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@company.com',
      name: 'System Administrator',
      role: 'admin',
      department: 'IT',
      password_hash: 'admin123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'manager@company.com',
      name: 'Department Manager',
      role: 'manager',
      department: 'Finance',
      password_hash: 'manager123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'employee@company.com',
      name: 'Team Employee',
      role: 'employee',
      department: 'Sales',
      password_hash: 'employee123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '7d591d65-69d0-4cf6-afdc-abb86d657bc1',
      email: 'randy@funmail.com',
      name: 'Randy Orton',
      role: 'admin',
      department: 'Administration',
      password_hash: 'Password123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '89e6e004-8186-4559-8391-e6be991ffe40',
      email: 'dilli@funmail.com',
      name: 'Dilli',
      role: 'manager',
      department: 'Engineering',
      password_hash: 'Password123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

// Get stored expenses with proper role-based data
const getStoredExpenses = (): Expense[] => {
  try {
    const stored = localStorage.getItem('app_expenses');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored expenses:', error);
  }
  
  // Generate role-based expenses for each user
  const users = getStoredUsers();
  const expenses: Expense[] = [];
  let expenseId = 1;

  const expenseTemplates = [
    { title: 'Business Lunch', category: 'Meals', amount: 45.50, status: 'pending' as const },
    { title: 'Office Supplies', category: 'Office Supplies', amount: 120.00, status: 'approved' as const },
    { title: 'Travel Expenses', category: 'Travel', amount: 350.00, status: 'draft' as const },
    { title: 'Software License', category: 'Software', amount: 299.99, status: 'approved' as const },
    { title: 'Training Course', category: 'Training', amount: 450.00, status: 'approved' as const }
  ];

  users.forEach(user => {
    expenseTemplates.forEach((template, index) => {
      expenses.push({
        id: `${expenseId++}`,
        user_id: user.id,
        title: `${template.title} - ${user.name}`,
        description: `${template.title} submitted by ${user.name} from ${user.department}`,
        amount: template.amount + (Math.random() * 50), // Add variation
        category: template.category,
        status: template.status,
        receipt_url: '',
        submitted_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
        created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
        updated_at: new Date().toISOString(),
        user_department: user.department
      });
    });
  });

  return expenses;
};

// Store users in localStorage
const storeUsers = (users: User[]) => {
  try {
    localStorage.setItem('app_users', JSON.stringify(users));
    console.log('Users stored successfully:', users.length, 'users');
  } catch (error) {
    console.error('Error storing users:', error);
  }
};

// Store expenses in localStorage
const storeExpenses = (expenses: Expense[]) => {
  try {
    localStorage.setItem('app_expenses', JSON.stringify(expenses));
    console.log('Expenses stored successfully:', expenses.length, 'expenses');
  } catch (error) {
    console.error('Error storing expenses:', error);
  }
};

// Initialize users and expenses storage
let mockUsers = getStoredUsers();
let mockExpenses = getStoredExpenses();

// Authentication functions with fallback
export const signUp = async (email: string, password: string, userData: {
  name: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
}) => {
  console.log('SignUp called with:', { email, userData });
  
  if (hasRealSupabaseCredentials()) {
    try {
      // Try real Supabase first
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();
      
      if (existingUser) {
        return { user: null, success: false, error: { message: 'User with this email already exists' } };
      }
      
      const userId = crypto.randomUUID();
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: email.toLowerCase(),
            name: userData.name,
            role: userData.role,
            department: userData.department,
            password_hash: password,
          }
        ])
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      return { user: newUser, success: true, error: null };
    } catch (error: any) {
      console.error('Supabase signup failed, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const existingUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { user: null, success: false, error: { message: 'User with this email already exists' } };
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    department: userData.department,
    password_hash: password,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockUsers.push(newUser);
  storeUsers(mockUsers);
  
  // Store password
  const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
  passwords[email.toLowerCase()] = password;
  localStorage.setItem('app_passwords', JSON.stringify(passwords));
  
  return { user: newUser, success: true, error: null };
};

export const signIn = async (email: string, password: string) => {
  console.log('SignIn called with:', { email });
  
  if (hasRealSupabaseCredentials()) {
    try {
      // Try real Supabase first
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (!profileError && userProfile && userProfile.password_hash === password) {
        console.log('Supabase login successful for:', userProfile.name);
        return { 
          user: userProfile, 
          error: null,
          session: { access_token: 'supabase-token-' + Date.now() }
        };
      }
    } catch (error) {
      console.error('Supabase login failed, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  mockUsers = getStoredUsers(); // Refresh from storage
  
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    console.log('User not found:', email);
    return { user: null, error: { message: 'Invalid email or password' } };
  }
  
  // Check password
  const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
  const storedPassword = passwords[email.toLowerCase()];
  
  // Use stored password or the password_hash from user data
  const validPassword = storedPassword || user.password_hash;
  
  if (validPassword !== password) {
    console.log('Invalid password for:', email);
    return { user: null, error: { message: 'Invalid email or password' } };
  }
  
  console.log('Login successful for:', user.name);
  return { 
    user, 
    error: null,
    session: { access_token: 'local-token-' + Date.now() }
  };
};

export const signOut = async () => {
  console.log('SignOut called');
  return { error: null };
};

export const getCurrentUser = async () => {
  return { user: null, error: null };
};

// Expense management functions with role-based filtering
export const getExpenses = async (currentUser: User): Promise<Expense[]> => {
  console.log('GetExpenses called for user:', currentUser.role, currentUser.department);
  
  if (hasRealSupabaseCredentials()) {
    try {
      let query = supabase.from('expenses').select('*');
      
      // Apply role-based filtering
      if (currentUser.role === 'employee') {
        query = query.eq('user_id', currentUser.id);
      } else if (currentUser.role === 'manager') {
        query = query.eq('user_department', currentUser.department);
      }
      // Admin gets all expenses (no filter)
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        console.log('Successfully fetched expenses from Supabase:', data.length);
        return data;
      }
    } catch (error) {
      console.error('Supabase getExpenses failed, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage with role-based filtering
  mockExpenses = getStoredExpenses();
  
  let filteredExpenses: Expense[] = [];
  
  if (currentUser.role === 'admin') {
    // Admin can see all expenses
    filteredExpenses = mockExpenses;
  } else if (currentUser.role === 'manager') {
    // Manager can see expenses from their department only
    filteredExpenses = mockExpenses.filter(expense => 
      expense.user_department === currentUser.department
    );
  } else {
    // Employee can only see their own expenses
    filteredExpenses = mockExpenses.filter(expense => 
      expense.user_id === currentUser.id
    );
  }
  
  console.log(`Filtered expenses for ${currentUser.role} (${currentUser.department}):`, filteredExpenses.length);
  return filteredExpenses;
};

// User management functions with role-based filtering
export const getUsers = async (): Promise<User[]> => {
  console.log('GetUsers called');
  
  if (hasRealSupabaseCredentials()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data && data.length > 0) {
        console.log('Successfully fetched users from Supabase:', data.length);
        return data;
      }
    } catch (error) {
      console.error('Supabase getUsers failed, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  mockUsers = getStoredUsers();
  console.log('Using localStorage users:', mockUsers.length);
  return mockUsers;
};

// Role-based user filtering
export const getUsersByRole = async (currentUser: User): Promise<User[]> => {
  console.log('GetUsersByRole called for:', currentUser.role, currentUser.department);
  
  const allUsers = await getUsers();
  
  if (currentUser.role === 'admin') {
    // Admin can see all users
    return allUsers;
  } else if (currentUser.role === 'manager') {
    // Manager can see users in their department only
    return allUsers.filter(user => 
      user.department === currentUser.department
    );
  } else {
    // Employees can only see themselves
    return allUsers.filter(user => user.id === currentUser.id);
  }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  console.log('GetUserProfile called:', { userId });
  
  if (hasRealSupabaseCredentials()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.error('Supabase getUserProfile failed:', error);
    }
  }
  
  // Fallback to localStorage
  mockUsers = getStoredUsers();
  return mockUsers.find(u => u.id === userId) || null;
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
  console.log('UpdateUserProfile called:', { userId, updates });
  
  if (hasRealSupabaseCredentials()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.error('Supabase updateUserProfile failed:', error);
    }
  }
  
  // Fallback to localStorage
  mockUsers = getStoredUsers();
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  storeUsers(mockUsers);
  return mockUsers[userIndex];
};

export const deleteUser = async (userId: string): Promise<void> => {
  console.log('DeleteUser called:', { userId });
  
  if (hasRealSupabaseCredentials()) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (!error) {
        return;
      }
    } catch (error) {
      console.error('Supabase deleteUser failed:', error);
    }
  }
  
  // Fallback to localStorage
  mockUsers = getStoredUsers();
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    mockUsers.splice(userIndex, 1);
    storeUsers(mockUsers);
  }
};

export const getDepartments = async () => {
  console.log('GetDepartments called');
  
  if (hasRealSupabaseCredentials()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('department')
        .not('department', 'is', null);
      
      if (!error && data) {
        const uniqueDepartments = [...new Set(data.map(item => item.department).filter(Boolean))];
        
        return uniqueDepartments.map((dept, index) => ({
          id: (index + 1).toString(),
          name: dept,
          description: `${dept} Department`,
          created_at: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Supabase getDepartments failed:', error);
    }
  }
  
  // Fallback to default departments
  return [
    { id: '1', name: 'IT', description: 'Information Technology', created_at: new Date().toISOString() },
    { id: '2', name: 'Finance', description: 'Finance and Accounting', created_at: new Date().toISOString() },
    { id: '3', name: 'Sales', description: 'Sales and Business Development', created_at: new Date().toISOString() },
    { id: '4', name: 'Marketing', description: 'Marketing and Communications', created_at: new Date().toISOString() },
    { id: '5', name: 'HR', description: 'Human Resources', created_at: new Date().toISOString() },
    { id: '6', name: 'Operations', description: 'Operations and Logistics', created_at: new Date().toISOString() },
    { id: '7', name: 'Engineering', description: 'Engineering and Development', created_at: new Date().toISOString() },
    { id: '8', name: 'Administration', description: 'General Administration', created_at: new Date().toISOString() }
  ];
};

export const requestPasswordReset = async (email: string) => {
  console.log('RequestPasswordReset called:', { email });
  
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { error: { message: 'No account found with this email address' } };
  }
  
  return { data: { id: 'temp', user_id: user.id, status: 'pending' }, error: null };
};

export const getPasswordResetRequests = async () => {
  console.log('GetPasswordResetRequests called');
  return { data: [], error: null };
};

export const approvePasswordReset = async (requestId: string, adminId: string) => {
  console.log('ApprovePasswordReset called:', { requestId, adminId });
  return { data: null, error: null };
};

export const rejectPasswordReset = async (requestId: string, adminId: string) => {
  console.log('RejectPasswordReset called:', { requestId, adminId });
  return { data: null, error: null };
};

// Debug function
export const debugAuth = () => {
  console.log('=== AUTH DEBUG ===');
  console.log('Has real Supabase credentials:', hasRealSupabaseCredentials());
  console.log('Supabase URL:', supabaseUrl);
  
  mockUsers = getStoredUsers();
  console.log('Total users available:', mockUsers.length);
  console.log('Available users:', mockUsers.map(u => ({ 
    email: u.email, 
    name: u.name, 
    role: u.role, 
    department: u.department 
  })));
  
  const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
  console.log('Stored passwords for:', Object.keys(passwords));
};

// Initialize storage on load
console.log('Initializing authentication system...');
storeUsers(mockUsers);
storeExpenses(mockExpenses);
debugAuth();