// src/lib/authService.ts
// Self-contained auth helpers (falls back to localStorage if Supabase not configured)

import { supabase } from './supabase';            // runtime client (no circular import)
import type { User } from './supabase';          // bring the User type into this module
export type { User };                            // re-export type for consumers

// local helper for auth (separate from supabase.ts to avoid circular imports)
const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem('app_users');
    if (stored) return JSON.parse(stored) as User[];
  } catch (err) {
    console.error('authService.getStoredUsers error', err);
  }

  // fallback test users (same shape as User)
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
    }
  ];
};

const storeUsers = (users: User[]) => {
  try {
    localStorage.setItem('app_users', JSON.stringify(users));
  } catch (err) {
    console.error('authService.storeUsers error', err);
  }
};

const hasRealSupabaseCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return url.includes('supabase.co') && url !== '' && key !== '';
};

// ----------------- Auth API (exports) -----------------

export const signUp = async (
  email: string,
  password: string,
  userData: { name: string; role: 'admin' | 'manager' | 'employee'; department: string }
) => {
  console.log('authService.signUp', email);

  // Try Supabase if configured
  if (hasRealSupabaseCredentials()) {
    try {
      const { data: existing } = await supabase.from('users').select('email').eq('email', email.toLowerCase()).single();
      if (existing) {
        return { user: null, success: false, error: { message: 'User already exists' } };
      }

      const userId = crypto.randomUUID();
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: email.toLowerCase(),
          name: userData.name,
          role: userData.role,
          department: userData.department,
          password_hash: password
        }])
        .select()
        .single();

      if (error) throw error;
      return { user: newUser, success: true, error: null };
    } catch (err: any) {
      console.error('Supabase signUp failed, falling back to local', err);
      // continue to local fallback
    }
  }

  // Local fallback
  const users = getStoredUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { user: null, success: false, error: { message: 'User already exists' } };
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

  users.push(newUser);
  storeUsers(users);

  const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
  passwords[email.toLowerCase()] = password;
  localStorage.setItem('app_passwords', JSON.stringify(passwords));

  return { user: newUser, success: true, error: null };
};

export const signIn = async (email: string, password: string) => {
  console.log('authService.signIn', email);

  if (hasRealSupabaseCredentials()) {
    try {
      const { data: userProfile, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
      if (!error && userProfile && userProfile.password_hash === password) {
        return { user: userProfile, error: null, session: { access_token: 'supabase-token-' + Date.now() } };
      }
    } catch (err) {
      console.error('Supabase signIn failed, falling back to local', err);
    }
  }

  // local fallback
  const users = getStoredUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { user: null, error: { message: 'Invalid email or password' } };

  const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
  const validPassword = passwords[email.toLowerCase()] || user.password_hash;
  if (validPassword !== password) return { user: null, error: { message: 'Invalid email or password' } };

  return { user, error: null, session: { access_token: 'local-token-' + Date.now() } };
};

export const signOut = async () => {
  if (hasRealSupabaseCredentials()) {
    try {
      await supabase.auth.signOut?.();
      return { error: null };
    } catch (err) {
      console.error('Supabase signOut failed', err);
    }
  }
  // local fallback
  return { error: null };
};

export const getCurrentUser = async () => {
  if (hasRealSupabaseCredentials()) {
    try {
      const maybe = await (supabase.auth.getUser?.() as unknown);
      if ((maybe as any)?.data?.user) {
        return { user: (maybe as any).data.user, error: null };
      }
      if ((maybe as any)?.user) return { user: (maybe as any).user, error: null };
      return { user: null, error: null };
    } catch (err) {
      console.error('Supabase getCurrentUser failed', err);
    }
  }
  return { user: null, error: null };
};

// debug helper - call from UI to inspect local fallback users/passwords
export const debugAuth = () => {
  console.log('=== authService debug ===');
  try {
    const users = getStoredUsers();
    console.log('Total users (local fallback):', users.length);
    console.table(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, dept: u.department })));
  } catch (err) {
    console.error('debugAuth: error reading users', err);
  }

  try {
    const passwords = JSON.parse(localStorage.getItem('app_passwords') || '{}');
    console.log('Stored passwords keys:', Object.keys(passwords));
    // WARNING: only for local dev — do not log real passwords in prod
    console.log('Stored passwords (DEV only):', passwords);
  } catch (err) {
    console.error('debugAuth: error reading passwords', err);
  }

  console.log('Has real Supabase credentials:', !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY));
};
