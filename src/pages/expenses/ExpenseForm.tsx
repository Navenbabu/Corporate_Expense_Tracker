import React, { useState, useEffect } from 'react';
import { useExpense } from '@/contexts/ExpenseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Receipt, Save, Send } from 'lucide-react';

interface FormData {
  title: string;
  amount: string;
  category: string;
  description: string;
  receipt_url: string;
}

const ExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { 
    currentExpense, 
    createExpense, 
    updateExpense, 
    fetchExpense, 
    clearCurrentExpense 
  } = useExpense();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    category: '',
    description: '',
    receipt_url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const categories = [
    'Travel',
    'Meals',
    'Office Supplies',
    'Software',
    'Training',
    'Equipment',
    'Marketing',
    'Other'
  ];

  useEffect(() => {
    if (id) {
      fetchExpense(id);
    } else {
      clearCurrentExpense();
    }
  }, [id, fetchExpense, clearCurrentExpense]);

  useEffect(() => {
    if (currentExpense) {
      setFormData({
        title: currentExpense.title,
        amount: currentExpense.amount.toString(),
        category: currentExpense.category,
        description: currentExpense.description || '',
        receipt_url: currentExpense.receipt_url || ''
      });
    }
  }, [currentExpense]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // In a real app, you would upload the file here
      // For now, we'll just create a mock URL
      const mockUrl = URL.createObjectURL(file);
      handleInputChange('receipt_url', mockUrl);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!validateForm()) return;
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        user_id: user.id,
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description.trim(),
        receipt_url: formData.receipt_url,
        status: isDraft ? 'draft' as const : 'pending' as const,
        submitted_at: new Date().toISOString()
      };

      if (id && currentExpense) {
        await updateExpense(id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await createExpense(expenseData);
        toast.success('Expense created successfully');
      }

      navigate('/expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/expenses')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Expense' : 'New Expense'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Business lunch with client"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional details about this expense..."
              rows={3}
            />
          </div>

          {formData.receipt_url && (
            <div className="space-y-2">
              <Label>Receipt Preview</Label>
              <img 
                src={formData.receipt_url} 
                alt="Receipt preview" 
                className="max-w-xs rounded-lg border"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseForm;