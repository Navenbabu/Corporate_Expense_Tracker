// Mock authentication system for the expense tracker
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
  created_at: string;
  updated_at: string;
}

// Default users with passwords
const defaultUsers = [
  {
    id: 'admin-001',
    email: 'admin@company.com',
    name: 'System Administrator',
    role: 'admin' as const,
    department: 'IT',
    password: 'admin123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'manager-001',
    email: 'manager@company.com',
    name: 'Department Manager',
    role: 'manager' as const,
    department: 'Finance',
    password: 'manager123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'employee-001',
    email: 'employee@company.com',
    name: 'Team Employee',
    role: 'employee' as const,
    department: 'Sales',
    password: 'employee123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initialize users in localStorage
const initializeUsers = () => {
  console.log('=== INITIALIZING MOCK AUTH USERS ===');
  localStorage.setItem('mockAuthUsers', JSON.stringify(defaultUsers));
  console.log('✅ Mock auth users initialized:', defaultUsers.length);
};

// Initialize on import
initializeUsers();

export const mockLogin = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  console.log('=== MOCK LOGIN ATTEMPT ===');
  console.log('Email:', email);
  console.log('Password:', password);

  // Get users from localStorage
  const users = JSON.parse(localStorage.getItem('mockAuthUsers') || '[]');
  console.log('Available users:', users.map((u: any) => ({ 
    email: u.email, 
    name: u.name, 
    role: u.role,
    password: u.password 
  })));

  // Find user by email (case insensitive)
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log('❌ User not found for email:', email);
    throw new Error('Invalid email or password');
  }

  console.log('Found user:', { 
    email: user.email, 
    name: user.name, 
    role: user.role,
    expectedPassword: user.password
  });

  // Check password
  if (user.password !== password) {
    console.log('❌ Password mismatch');
    console.log('Expected:', user.password);
    console.log('Received:', password);
    throw new Error('Invalid email or password');
  }

  console.log('✅ Login successful for:', user.name);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  
  return {
    token: `mock-token-${Date.now()}`,
    user: userWithoutPassword
  };
};

export const mockVerifyToken = async (token: string): Promise<boolean> => {
  return token && token.startsWith('mock-token-');
};

export const mockRegister = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }): Promise<User> => {
  console.log('=== MOCK REGISTER ===');
  
  const users = JSON.parse(localStorage.getItem('mockAuthUsers') || '[]');
  
  // Check if user already exists
  const existingUser = users.find((u: any) => u.email.toLowerCase() === userData.email.toLowerCase());
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    department: userData.department,
    password: userData.password,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Add to localStorage
  users.push(newUser);
  localStorage.setItem('mockAuthUsers', JSON.stringify(users));

  console.log('✅ User registered successfully');

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

export const getAllUsers = (): User[] => {
  try {
    const users = JSON.parse(localStorage.getItem('mockAuthUsers') || '[]');
    // Remove passwords from response
    return users.map((user: any) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};