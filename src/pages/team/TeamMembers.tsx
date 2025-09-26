import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Eye, Edit, Trash2, Users, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getUsersByRole, getUserProfile, updateUserProfile, deleteUser, getDepartments, User, signUp } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const TeamMembers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const { user: currentUser } = useAuth();

  // New user form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'manager' | 'employee',
    department: ''
  });

  // Load users and departments with role-based filtering
  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      console.log('Loading users with role-based filtering for:', currentUser.role, currentUser.department);
      
      // FIXED: Use getUsersByRole instead of getUsers for role-based filtering
      const usersData = await getUsersByRole(currentUser);
      console.log('Loaded filtered users:', usersData);
      
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
        setFilteredUsers(usersData);
        toast.success(`Loaded ${usersData.length} users from your ${currentUser.role === 'admin' ? 'organization' : 'department'}`);
      } else {
        console.warn('No users found for current user role');
        toast.warning(`No users found in your ${currentUser.role === 'admin' ? 'organization' : 'department'}`);
      }

      // Load departments
      const deptData = await getDepartments();
      console.log('Loaded departments:', deptData);
      setDepartments(deptData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Department filter - FIXED: Only show current user's department for managers
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(user => user.department === departmentFilter);
    } else if (currentUser?.role === 'manager') {
      // FIXED: Managers should only see their own department even when "all" is selected
      filtered = filtered.filter(user => user.department === currentUser.department);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, departmentFilter, currentUser]);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    // FIXED: Managers can only create users in their own department
    if (currentUser?.role === 'manager' && newUser.department !== currentUser.department) {
      toast.error(`As a manager, you can only create users in your department (${currentUser.department})`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsCreatingUser(true);
    try {
      console.log('Creating new user:', { 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role, 
        department: newUser.department 
      });

      // Call the signUp function to create the user
      const result = await signUp(newUser.email, newUser.password, {
        name: newUser.name,
        role: newUser.role,
        department: newUser.department
      });

      console.log('SignUp result:', result);

      if (result.success && result.user) {
        toast.success(`User "${newUser.name}" created successfully!`);
        setIsAddDialogOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'employee', department: '' });
        
        // Reload data to show the new user
        await loadData();
      } else if (result.error) {
        toast.error(result.error.message || 'Failed to create user');
      } else {
        toast.error('Failed to create user - unknown error');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !currentUser) return;

    // FIXED: Managers can only edit users in their own department
    if (currentUser.role === 'manager' && editingUser.department !== currentUser.department) {
      toast.error(`You can only edit users in your department (${currentUser.department})`);
      return;
    }

    try {
      const updatedUser = await updateUserProfile(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        department: editingUser.department
      });

      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!currentUser) return;

    // FIXED: Check if manager is trying to delete user from another department
    const userToDelete = users.find(u => u.id === userId);
    if (currentUser.role === 'manager' && userToDelete?.department !== currentUser.department) {
      toast.error(`You can only delete users from your department (${currentUser.department})`);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  // FIXED: Get available departments based on user role
  const getAvailableDepartments = () => {
    if (currentUser?.role === 'admin') {
      return departments; // Admin can see all departments
    } else if (currentUser?.role === 'manager') {
      return departments.filter(dept => dept.name === currentUser.department); // Manager only sees their department
    }
    return []; // Employees shouldn't create users
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading team members...</span>
        </div>
      </div>
    );
  }

  // FIXED: Only admins and managers should see team management
  if (currentUser?.role === 'employee') {
    return (
      <div className="p-6">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Members</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view team members.</p>
          <p className="text-sm text-gray-500">Contact your manager or admin for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-1">
            {currentUser?.role === 'admin' 
              ? 'Manage all team members across the organization'
              : `Manage team members in ${currentUser?.department} department`
            }
          </p>
        </div>
        {/* FIXED: Only show Add User button for admins and managers */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
                <DialogDescription>
                  Create a new user account for your team member. They will be able to login with the provided credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={newUser.role} onValueChange={(value: 'admin' | 'manager' | 'employee') => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      {currentUser?.role === 'admin' && (
                        <>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select 
                    value={newUser.department} 
                    onValueChange={(value) => setNewUser({ ...newUser, department: value })}
                    disabled={currentUser?.role === 'manager'} // Managers can only create in their dept
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        currentUser?.role === 'manager' 
                          ? currentUser.department 
                          : "Select department"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDepartments().map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentUser?.role === 'manager' && (
                    <p className="text-xs text-gray-500 mt-1">
                      You can only create users in your department ({currentUser.department})
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isCreatingUser}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
        {/* FIXED: Department filter for admins only */}
        {currentUser?.role === 'admin' && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{filteredUsers.length} users</span>
        </div>
      </div>

      {/* Role-based info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">
          {currentUser?.role === 'admin' ? 'Admin Access:' : 'Manager Access:'}
        </h3>
        <p className="text-sm text-blue-700">
          {currentUser?.role === 'admin' 
            ? `You can view and manage all ${users.length} users across all departments.`
            : `You can view and manage ${users.length} users in the ${currentUser?.department} department only.`
          }
        </p>
        {users.length > 0 && (
          <div className="mt-2 text-xs text-blue-600">
            Departments: {currentUser?.role === 'admin' 
              ? [...new Set(users.map(u => u.department))].join(', ')
              : currentUser?.department
            }
          </div>
        )}
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-4">
            {users.length === 0 
              ? `No users found in your ${currentUser?.role === 'admin' ? 'organization' : 'department'}.`
              : "No users match your current filters. Try adjusting your search criteria."
            }
          </p>
          {users.length === 0 && (currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="mb-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <CardDescription className="text-sm">{user.email}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    {user.department}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Joined {formatDate(user.created_at || '')}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingUser(user);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member's information.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: 'admin' | 'manager' | 'employee') => 
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    {currentUser?.role === 'admin' && (
                      <>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select 
                  value={editingUser.department} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, department: value })}
                  disabled={currentUser?.role === 'manager'} // Managers can't change department
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDepartments().map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentUser?.role === 'manager' && (
                  <p className="text-xs text-gray-500 mt-1">
                    You can only manage users in your department
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamMembers;