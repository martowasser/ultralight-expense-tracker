"use client";

import { useState } from "react";
import { createExpense, Currency } from "@/app/dashboard/actions";

interface AddExpenseModalProps {
  currentMonth: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({
  currentMonth,
  onClose,
  onSuccess,
}: AddExpenseModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!name.trim()) {
      setError("name is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("amount must be a positive number");
      return;
    }

    const dueDayNum = parseInt(dueDay);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError("due day must be between 1 and 31");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createExpense({
        name: name.trim(),
        amount: amountNum,
        dueDay: dueDayNum,
        month: currentMonth,
        currency,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create expense");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add expense</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <p className="text-sm text-[#737373]">{error}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm text-[#737373]">
              name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="rent, netflix, electricity..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="amount" className="block text-sm text-[#737373]">
              amount
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="flex-1 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
                disabled={isSubmitting}
              />
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-24 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="dueDay" className="block text-sm text-[#737373]">
              due day
            </label>
            <input
              type="number"
              id="dueDay"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              min="1"
              max="31"
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="1-31"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? "adding..." : "add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
