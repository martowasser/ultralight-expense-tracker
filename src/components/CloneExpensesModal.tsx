"use client";

import { useState, useEffect } from "react";
import {
  getPreviousMonthExpenses,
  cloneExpenses,
  PreviousMonthExpense,
} from "@/app/dashboard/actions";

interface CloneExpensesModalProps {
  currentMonth: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloneExpensesModal({
  currentMonth,
  onClose,
  onSuccess,
}: CloneExpensesModalProps) {
  const [previousExpenses, setPreviousExpenses] = useState<PreviousMonthExpense[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Calculate previous month display name
  const getPreviousMonthDisplay = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return prevDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  useEffect(() => {
    const fetchPreviousExpenses = async () => {
      setIsLoading(true);
      const expenses = await getPreviousMonthExpenses(currentMonth);
      setPreviousExpenses(expenses);
      // Initialize amounts with previous month's amounts
      const initialAmounts: Record<string, string> = {};
      expenses.forEach((exp) => {
        initialAmounts[exp.expenseId] = exp.amount;
      });
      setAmounts(initialAmounts);
      setIsLoading(false);
    };

    fetchPreviousExpenses();
  }, [currentMonth]);

  const handleAmountChange = (expenseId: string, value: string) => {
    setAmounts((prev) => ({
      ...prev,
      [expenseId]: value,
    }));
  };

  const handleSubmit = async () => {
    setError("");

    // Validate all amounts
    const expensesToClone = previousExpenses.map((exp) => {
      const amount = parseFloat(amounts[exp.expenseId] || "0");
      return {
        expenseId: exp.expenseId,
        amount,
      };
    });

    // Check for invalid amounts
    for (const exp of expensesToClone) {
      if (isNaN(exp.amount) || exp.amount <= 0) {
        setError("All amounts must be positive numbers");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await cloneExpenses({
        targetMonth: currentMonth,
        expenses: expensesToClone,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Failed to clone expenses. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Clone from Previous Month</h2>
          <p className="text-sm text-gray-500 mt-1">
            Clone expenses from {getPreviousMonthDisplay()}
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading previous month expenses...</div>
            </div>
          ) : previousExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No expenses found in {getPreviousMonthDisplay()}</p>
              <p className="text-sm text-gray-400 mt-2">
                Add some expenses to the previous month first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 pb-2 border-b">
                <div className="col-span-5">Name</div>
                <div className="col-span-3 text-right">Previous</div>
                <div className="col-span-4 text-right">New Amount</div>
              </div>

              {previousExpenses.map((expense) => (
                <div key={expense.expenseId} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-gray-900">{expense.name}</p>
                    <p className="text-xs text-gray-500">Due day: {expense.dueDay}</p>
                  </div>
                  <div className="col-span-3 text-right text-sm text-gray-500">
                    ${parseFloat(expense.amount).toFixed(2)}
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      value={amounts[expense.expenseId] || ""}
                      onChange={(e) => handleAmountChange(expense.expenseId, e.target.value)}
                      step="0.01"
                      min="0.01"
                      disabled={isSubmitting}
                      className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || previousExpenses.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Cloning..." : "Confirm Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
