import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExpense } from '@/contexts/ExpenseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  FileText, 
  User,
  Clock,
  CheckCircle,
  XCircle,
  Receipt
} from 'lucide-react';

const ExpenseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentExpense,
    loading,
    fetchExpense,
    submitExpense,
    approveExpense,
    rejectExpense
  } = useExpense();

  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentTimeline, setPaymentTimeline] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExpense(id);
    }
  }, [id, fetchExpense]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentExpense) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Expense not found</p>
        <Button onClick={() => navigate('/expenses')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (currentExpense.id) {
      await submitExpense(currentExpense.id);
    }
  };

  const handleApprove = async () => {
    if (currentExpense.id && user?.id) {
      await approveExpense(currentExpense.id, user.id, paymentTimeline);
      setShowApprovalForm(false);
      setPaymentTimeline('');
    }
  };

  const handleReject = async () => {
    if (currentExpense.id && user?.id) {
      await rejectExpense(currentExpense.id, user.id, rejectionReason);
      setShowRejectionForm(false);
      setRejectionReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canApprove = user?.role === 'admin' || user?.role === 'manager';
  const canSubmit = currentExpense.status === 'draft' && currentExpense.user_id === user?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/expenses')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
        {getStatusBadge(currentExpense.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {currentExpense.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </Label>
              <p className="text-2xl font-bold">₹{currentExpense.amount.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <p>{new Date(currentExpense.submitted_at || '').toLocaleDateString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <p>{currentExpense.category}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Submitted By
              </Label>
              <p>{currentExpense.user_id}</p>
            </div>
          </div>

          {currentExpense.description && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <p className="text-gray-700">{currentExpense.description}</p>
            </div>
          )}

          {currentExpense.receipt_url && (
            <div className="space-y-2">
              <Label>Receipt</Label>
              <img 
                src={currentExpense.receipt_url} 
                alt="Receipt" 
                className="max-w-md rounded-lg border"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {canSubmit && (
              <Button onClick={handleSubmit}>
                Submit for Approval
              </Button>
            )}

            {canApprove && currentExpense.status === 'pending' && (
              <>
                <Button 
                  onClick={() => setShowApprovalForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button 
                  onClick={() => setShowRejectionForm(true)}
                  variant="destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>

          {/* Approval Form */}
          {showApprovalForm && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Approve Expense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paymentTimeline">Payment Timeline</Label>
                  <Input
                    id="paymentTimeline"
                    value={paymentTimeline}
                    onChange={(e) => setPaymentTimeline(e.target.value)}
                    placeholder="e.g., Within 5 business days"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApprove}>Confirm Approval</Button>
                  <Button variant="outline" onClick={() => setShowApprovalForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Form */}
          {showRejectionForm && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Reject Expense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleReject}
                    variant="destructive"
                    disabled={!rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </Button>
                  <Button variant="outline" onClick={() => setShowRejectionForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseDetail;