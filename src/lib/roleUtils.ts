// Role-based access control utilities
export type UserRole = 'admin' | 'manager' | 'employee';

export interface RolePermissions {
  canViewTeamMembers: boolean;
  canManageUsers: boolean;
  canApproveExpenses: boolean;
  canViewAllExpenses: boolean;
  canViewReports: boolean;
  canManagePasswordResets: boolean;
  canViewDashboard: boolean;
  canCreateExpenses: boolean;
  canEditOwnExpenses: boolean;
}

// Role hierarchy levels
export const ROLE_LEVELS = {
  employee: 1,
  manager: 2,
  admin: 3
} as const;

// Get role permissions
export const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case 'admin':
      return {
        canViewTeamMembers: true,
        canManageUsers: true,
        canApproveExpenses: true,
        canViewAllExpenses: true,
        canViewReports: true,
        canManagePasswordResets: true,
        canViewDashboard: true,
        canCreateExpenses: true,
        canEditOwnExpenses: true,
      };
    case 'manager':
      return {
        canViewTeamMembers: true,
        canManageUsers: false,
        canApproveExpenses: true,
        canViewAllExpenses: true, // Can view department expenses
        canViewReports: true,
        canManagePasswordResets: false,
        canViewDashboard: true,
        canCreateExpenses: true,
        canEditOwnExpenses: true,
      };
    case 'employee':
      return {
        canViewTeamMembers: false,
        canManageUsers: false,
        canApproveExpenses: false,
        canViewAllExpenses: false, // Can only view own expenses
        canViewReports: false,
        canManagePasswordResets: false,
        canViewDashboard: true,
        canCreateExpenses: true,
        canEditOwnExpenses: true,
      };
    default:
      return {
        canViewTeamMembers: false,
        canManageUsers: false,
        canApproveExpenses: false,
        canViewAllExpenses: false,
        canViewReports: false,
        canManagePasswordResets: false,
        canViewDashboard: false,
        canCreateExpenses: false,
        canEditOwnExpenses: false,
      };
  }
};

// Check if user has required role level
export const hasRoleLevel = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const userLevel = ROLE_LEVELS[userRole];
  const requiredLevel = ROLE_LEVELS[requiredRole];
  return userLevel >= requiredLevel;
};

// Check specific permission
export const hasPermission = (userRole: UserRole, permission: keyof RolePermissions): boolean => {
  const permissions = getRolePermissions(userRole);
  return permissions[permission];
};

// Get filtered navigation items based on role
export const getNavigationItems = (userRole: UserRole) => {
  const permissions = getRolePermissions(userRole);
  
  const allItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      permission: 'canViewDashboard' as keyof RolePermissions
    },
    {
      name: 'Expenses',
      href: '/expenses',
      icon: 'Receipt',
      permission: 'canCreateExpenses' as keyof RolePermissions
    },
    {
      name: 'Team Members',
      href: '/team',
      icon: 'Users',
      permission: 'canViewTeamMembers' as keyof RolePermissions
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: 'PieChart',
      permission: 'canViewReports' as keyof RolePermissions
    },
    {
      name: 'Password Resets',
      href: '/admin/password-resets',
      icon: 'Key',
      permission: 'canManagePasswordResets' as keyof RolePermissions
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: 'Settings',
      permission: 'canViewDashboard' as keyof RolePermissions // Everyone can access settings
    }
  ];

  return allItems.filter(item => permissions[item.permission]);
};

// Get users by role (for team management)
export const getUsersByRole = async (currentUser: { role: UserRole; department?: string }) => {
  // This would typically fetch from your database
  // For now, return mock data based on role
  const mockUsers = [
    { id: '1', name: 'Admin User', role: 'admin', department: 'IT' },
    { id: '2', name: 'Manager User', role: 'manager', department: 'Finance' },
    { id: '3', name: 'Employee User', role: 'employee', department: 'Sales' },
  ];

  if (currentUser.role === 'admin') {
    return mockUsers; // Admin can see all users
  } else if (currentUser.role === 'manager') {
    // Manager can see users in their department
    return mockUsers.filter(user => 
      user.department === currentUser.department || user.role === 'employee'
    );
  } else {
    return []; // Employees can't see team members
  }
};