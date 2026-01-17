"use client";

import { useState } from "react";
import { updateExpense, MonthlyExpenseWithExpense } from "@/app/dashboard/actions";

interface EditExpenseModalProps {
  expense: MonthlyExpenseWithExpense;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditExpenseModal({
  expense,
  onClose,
  onSuccess,
}: EditExpenseModalProps) {
  const [name, setName] = useState(expense.expense.name);
  const [amount, setAmount] = useState(expense.amount);
  const [dueDay, setDueDay] = useState(expense.expense.dueDay.toString());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    const dueDayNum = parseInt(dueDay);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError("Due day must be between 1 and 31");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateExpense({
        expenseId: expense.expenseId,
        monthlyExpenseId: expense.id,
        name: name.trim(),
        amount: amountNum,
        dueDay: dueDayNum,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Failed to update expense. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Rent, Netflix, Electricity"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="dueDay" className="block text-sm font-medium text-gray-700 mb-1">
              Due Day <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="dueDay"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              min="1"
              max="31"
              className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1-31"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
