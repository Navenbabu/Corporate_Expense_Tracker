import Expense from "../models/Expense.js";

/** Fetch all expenses for a specific user */
export const getUserExpenses = async (req, res) => {
  try {
    const { userId } = req.params;
    const expenses = await Expense.find({ user_id: userId }).sort({ createdAt: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

/** Create new expense */
export const createExpense = async (req, res) => {
  try {
    const { title, description, amount, category, status, receipt_url, user_id, user_department } = req.body;
    const expense = await Expense.create({
      title,
      description,
      amount,
      category,
      status: status || "pending",
      receipt_url,
      user_id,
      user_department,
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
};

/** Update expense */
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndUpdate(id, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.status(200).json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
};

/** Delete expense */
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
};
