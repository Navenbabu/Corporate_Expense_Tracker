import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "./AuthContext";

// 🧩 Expense type with all fields used in UI
export interface Expense {
  _id?: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  status: "draft" | "pending" | "approved" | "rejected";
  receipt_url?: string;
  user_id?: string;
  user_department?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  submitted_at?: string;
  rejection_reason?: string;
  payment_timeline?: string;
}

// 🧩 Context type (fully extended)
interface ExpenseContextType {
  expenses: Expense[];
  currentExpense: Expense | null;
  loading: boolean;
  error: string | null;

  fetchExpenses: () => Promise<void>;
  fetchExpense: (id: string) => Promise<Expense | null>;
  createExpense: (data: Omit<Expense, "_id">) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  submitExpense: (id: string) => Promise<void>;
  approveExpense: (id: string, approverId: string, paymentTimeline?: string) => Promise<void>;
  rejectExpense: (id: string, approverId: string, reason: string) => Promise<void>;

  setCurrentExpense: (expense: Expense | null) => void;
  clearCurrentExpense: () => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const useExpense = () => {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpense must be used within an ExpenseProvider");
  return ctx;
};

interface Props {
  children: ReactNode;
}

export const ExpenseProvider: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch all expenses
  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/expenses`);
      setExpenses(res.data.expenses || res.data || []);
    } catch (err: any) {
      console.error("Fetch expenses error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ Fetch single expense
  const fetchExpense = useCallback(async (id: string): Promise<Expense | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/expenses/${id}`);
      const expense = res.data.expense || res.data;
      setCurrentExpense(expense);
      return expense;
    } catch (err: any) {
      console.error("Fetch expense error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to fetch expense");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Create expense
  const createExpense = useCallback(
    async (data: Omit<Expense, "_id">) => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await apiClient.post("/expenses", data);
        const expense = res.data.expense || res.data;
        setExpenses((prev) => [expense, ...prev]);
        setCurrentExpense(null);
      } catch (err: any) {
        console.error("Create expense error:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to create expense");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // ✅ Update expense
  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    setLoading(true);
    try {
      const res = await apiClient.put(`/expenses/${id}`, updates);
      const updated = res.data.expense || res.data;
      setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
      setCurrentExpense(null);
    } catch (err: any) {
      console.error("Update expense error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to update expense");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
    } catch (err: any) {
      console.error("Delete expense error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to delete expense");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Submit expense
  const submitExpense = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.put(`/expenses/${id}/submit`);
      const updated = res.data.expense || res.data;
      setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
      setCurrentExpense(updated);
    } catch (err: any) {
      console.error("Submit expense error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to submit expense");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Approve expense
  const approveExpense = useCallback(
    async (id: string, approverId: string, paymentTimeline?: string) => {
      setLoading(true);
      try {
        const res = await apiClient.put(`/expenses/${id}/approve`, {
          approverId,
          paymentTimeline,
        });
        const updated = res.data.expense || res.data;
        setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
        setCurrentExpense(updated);
      } catch (err: any) {
        console.error("Approve expense error:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to approve expense");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ Reject expense
  const rejectExpense = useCallback(
    async (id: string, approverId: string, reason: string) => {
      setLoading(true);
      try {
        const res = await apiClient.put(`/expenses/${id}/reject`, {
          approverId,
          reason,
        });
        const updated = res.data.expense || res.data;
        setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
        setCurrentExpense(updated);
      } catch (err: any) {
        console.error("Reject expense error:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to reject expense");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ Clear current expense
  const clearCurrentExpense = () => setCurrentExpense(null);

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user?._id, fetchExpenses]);

  const value: ExpenseContextType = {
    expenses,
    currentExpense,
    loading,
    error,
    fetchExpenses,
    fetchExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    submitExpense,
    approveExpense,
    rejectExpense,
    setCurrentExpense,
    clearCurrentExpense,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
};
