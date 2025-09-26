import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExpense } from '@/contexts/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ExpenseService } from '@/lib/expenseService';
import { getUsers } from '@/lib/supabase';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { expenses } = useExpense();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load users only once
  const loadUsers = useCallback(async () => {
    if (!user || allUsers.length > 0) return;
    
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [user, allUsers.length]);

  // Generate dashboard data when dependencies change
  const generateDashboardData = useCallback(() => {
    if (!user || !expenses || expenses.length === 0) {
      return;
    }

    try {
      // Generate role-based dashboard data
      const stats = ExpenseService.getDashboardStats(user, expenses);
      const categories = ExpenseService.getCategoryData(user, expenses);
      const monthly = ExpenseService.getMonthlyData(user, expenses);
      
      setDashboardStats(stats);
      setCategoryData(categories);
      setMonthlyData(monthly);
      
      console.log(`Dashboard loaded for ${user.role} (${user.department}):`, {
        totalExpenses: stats.totalExpenses,
        totalAmount: stats.totalAmount,
        categories: categories.length,
        monthlyData: monthly.length
      });
    } catch (error) {
      console.error('Error generating dashboard data:', error);
    }
  }, [user, expenses]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Generate dashboard data when expenses change
  useEffect(() => {
    if (user && expenses.length >= 0) { // Allow for 0 expenses
      generateDashboardData();
      setIsInitialized(true);
    }
  }, [user?.id, expenses.length, generateDashboardData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isInitialized || !dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            {user?.role === 'admin' 
              ? 'Here\'s an overview of all corporate expenses'
              : user?.role === 'manager'
              ? `Here's an overview of ${user.department} department expenses`
              : 'Here\'s an overview of your personal expenses'
            }
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardStats.totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.totalExpenses} expenses total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.approvedExpenses}</div>
            <p className="text-xs text-muted-foreground">
              ₹{dashboardStats.approvedAmount.toFixed(2)} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardStats.totalExpenses > 0 ? (dashboardStats.totalAmount / dashboardStats.totalExpenses).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per expense
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Only render if we have data */}
      {categoryData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart - Expense Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                Expense Categories
                {user?.role !== 'employee' && (
                  <span className="text-sm text-gray-500">({user?.role === 'admin' ? 'All Departments' : user?.department})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Line Chart - Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                Monthly Expense Trends
                {user?.role !== 'employee' && (
                  <span className="text-sm text-gray-500">({user?.role === 'admin' ? 'All Departments' : user?.department})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#666"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#666"
                      fontSize={12}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`₹${value}`, name === 'expenses' ? 'Total Expenses' : name === 'approved' ? 'Approved' : 'Pending']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Expenses
              {user?.role !== 'employee' && (
                <span className="text-sm text-gray-500">({user?.role === 'admin' ? 'All Departments' : user?.department})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardStats.recentExpenses.map((expense: any) => (
              <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-sm text-gray-500">{expense.category}</p>
                  <p className="text-xs text-gray-400">{new Date(expense.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{expense.amount.toFixed(2)}</p>
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            ))}
            {dashboardStats.recentExpenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No expenses found</p>
                <p className="text-sm">Submit your first expense to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <Receipt className="mr-2 h-4 w-4" />
              Submit New Expense
            </Button>
            
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Review Pending Expenses
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Button>
              </>
            )}
            
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Admin/Manager specific sections */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <Card>
          <CardHeader>
            <CardTitle>
              {user?.role === 'admin' ? 'Corporate Overview' : `${user?.department} Department Overview`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dashboardStats.pendingExpenses}</div>
                <div className="text-sm text-gray-500">Pending Reviews</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">₹{dashboardStats.approvedAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Approved Amount</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {user?.role === 'admin' ? allUsers.length : allUsers.filter(u => u.department === user?.department).length}
                </div>
                <div className="text-sm text-gray-500">
                  {user?.role === 'admin' ? 'Total Users' : 'Department Members'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;