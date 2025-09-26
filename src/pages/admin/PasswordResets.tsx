import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Mail, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  new_password?: string;
  notes?: string;
  user_name?: string;
  approver_name?: string;
}

const PasswordResets: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const loadPasswordResets = async () => {
    try {
      setIsLoading(true);
      console.log('=== LOADING PASSWORD RESET REQUESTS ===');

      const { data: resetRequests, error } = await supabase
        .from('app_643541ecfa_password_resets')
        .select(`
          *,
          user:app_643541ecfa_users!app_643541ecfa_password_resets_user_id_fkey(name),
          approver:app_643541ecfa_users!app_643541ecfa_password_resets_approved_by_fkey(name)
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading password resets:', error);
        toast.error('Failed to load password reset requests');
        return;
      }

      // Transform the data to include user names
      const transformedRequests = resetRequests?.map(request => ({
        ...request,
        user_name: request.user?.name || 'Unknown User',
        approver_name: request.approver?.name || undefined
      })) || [];

      console.log('✅ Loaded password reset requests:', transformedRequests.length);
      setRequests(transformedRequests);

    } catch (error: any) {
      console.error('Error loading password resets:', error);
      toast.error('Failed to load password reset requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadPasswordResets();
    }
  }, [user]);

  const handleApproveRequest = async () => {
    if (!selectedRequest || !newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('=== APPROVING PASSWORD RESET ===');
      console.log('Request ID:', selectedRequest.id);
      console.log('New Password:', newPassword);

      // Update the user's password
      const { error: updateUserError } = await supabase
        .from('app_643541ecfa_users')
        .update({
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.user_id);

      if (updateUserError) {
        console.error('❌ Error updating user password:', updateUserError);
        toast.error('Failed to update user password');
        return;
      }

      // Update the reset request status
      const { error: updateRequestError } = await supabase
        .from('app_643541ecfa_password_resets')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          new_password: newPassword,
          notes: notes.trim() || null
        })
        .eq('id', selectedRequest.id);

      if (updateRequestError) {
        console.error('❌ Error updating reset request:', updateRequestError);
        toast.error('Failed to update reset request');
        return;
      }

      console.log('✅ Password reset approved successfully');
      toast.success(`Password reset approved for ${selectedRequest.email}`);
      
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setNewPassword('');
      setNotes('');
      await loadPasswordResets();

    } catch (error: any) {
      console.error('Error approving password reset:', error);
      toast.error('Failed to approve password reset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);

    try {
      console.log('=== REJECTING PASSWORD RESET ===');
      console.log('Request ID:', selectedRequest.id);

      const { error } = await supabase
        .from('app_643541ecfa_password_resets')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: notes.trim() || 'Request rejected by administrator'
        })
        .eq('id', selectedRequest.id);

      if (error) {
        console.error('❌ Error rejecting reset request:', error);
        toast.error('Failed to reject reset request');
        return;
      }

      console.log('✅ Password reset rejected successfully');
      toast.success(`Password reset request rejected for ${selectedRequest.email}`);
      
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setNotes('');
      await loadPasswordResets();

    } catch (error: any) {
      console.error('Error rejecting password reset:', error);
      toast.error('Failed to reject password reset');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDialog = (request: PasswordResetRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setNewPassword('');
    setNotes('');
    setIsDialogOpen(true);
  };

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

  const handleRefresh = () => {
    loadPasswordResets();
    toast.success('Password reset requests refreshed');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">Only administrators can manage password resets.</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Key className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Password Reset Requests</h1>
            <p className="text-gray-600">Manage user password reset requests</p>
          </div>
        </div>

        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {pendingRequests.length} pending password reset request{pendingRequests.length !== 1 ? 's' : ''} that need your attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{requests.filter(r => r.status === 'pending').length}</div>
              <div className="text-sm text-gray-500">Pending Requests</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'approved').length}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{requests.filter(r => r.status === 'rejected').length}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading password reset requests...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={`hover:shadow-lg transition-shadow ${request.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{request.user_name}</CardTitle>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {request.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    {request.status === 'pending' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          onClick={() => openDialog(request, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDialog(request, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-500">Requested:</span>
                    <span className="ml-2 font-medium">
                      {new Date(request.requested_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {request.approved_at && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-500">Processed:</span>
                      <span className="ml-2 font-medium">
                        {new Date(request.approved_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {request.approver_name && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-500">Processed by:</span>
                      <span className="ml-2 font-medium">{request.approver_name}</span>
                    </div>
                  )}
                </div>
                
                {request.notes && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {request.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Password Reset Requests</h3>
          <p className="text-gray-500">There are no password reset requests at the moment.</p>
        </div>
      )}

      {/* Process Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Password Reset
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm"><strong>User:</strong> {selectedRequest.user_name}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedRequest.email}</p>
                <p className="text-sm"><strong>Requested:</strong> {new Date(selectedRequest.requested_at).toLocaleString()}</p>
              </div>

              {actionType === 'approve' && (
                <div>
                  <Label htmlFor="newPassword">New Password *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    minLength={6}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Add any notes about the password reset...' : 'Reason for rejection...'}
                  rows={3}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={actionType === 'approve' ? handleApproveRequest : handleRejectRequest}
                  disabled={isProcessing || (actionType === 'approve' && !newPassword.trim())}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'bg-red-600 hover:bg-red-700 flex-1'}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === 'approve' ? (
                        <><CheckCircle className="h-4 w-4 mr-2" />Approve & Set Password</>
                      ) : (
                        <><XCircle className="h-4 w-4 mr-2" />Reject Request</>
                      )}
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordResets;