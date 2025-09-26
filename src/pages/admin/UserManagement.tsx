import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const UserManagement: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">Only administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage users across the organization</p>
      </div>
      
      <div className="text-center py-8">
        <p className="text-gray-500">User management features coming soon...</p>
      </div>
    </div>
  );
};

export default UserManagement;