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
    return prevDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
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
        setError("all amounts must be positive numbers");
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
      setError("failed to clone expenses");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[480px] sm:mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">clone from previous</h2>
          <p className="text-xs text-[#a3a3a3] mt-1">
            {getPreviousMonthDisplay()}
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm text-[#737373] mb-4">{error}</p>
          )}

          {isLoading ? (
            <p className="text-sm text-[#a3a3a3] text-center py-8">loading...</p>
          ) : previousExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#a3a3a3]">no expenses in {getPreviousMonthDisplay()}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {previousExpenses.map((expense) => (
                <div key={expense.expenseId} className="py-3 border-b border-[#e5e5e5] last:border-b-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm text-[#171717]">{expense.name}</p>
                      <p className="text-xs text-[#a3a3a3]">due day {expense.dueDay}</p>
                    </div>
                    <p className="text-sm text-[#a3a3a3] tabular-nums">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#a3a3a3]">new amount</label>
                    <input
                      type="number"
                      value={amounts[expense.expenseId] || ""}
                      onChange={(e) => handleAmountChange(expense.expenseId, e.target.value)}
                      step="0.01"
                      min="0.01"
                      disabled={isSubmitting}
                      className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none disabled:opacity-50 tabular-nums"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#e5e5e5] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || previousExpenses.length === 0}
            className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? "cloning..." : "confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
