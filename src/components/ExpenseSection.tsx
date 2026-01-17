"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExpenseList from "./ExpenseList";
import AddExpenseModal from "./AddExpenseModal";
import { MonthlyExpenseWithExpense } from "@/app/dashboard/actions";

interface ExpenseSectionProps {
  expenses: MonthlyExpenseWithExpense[];
  currentMonth: string;
  displayMonth: string;
}

export default function ExpenseSection({
  expenses,
  currentMonth,
  displayMonth,
}: ExpenseSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Expense
        </button>
      </div>

      <ExpenseList expenses={expenses} displayMonth={displayMonth} />

      {isModalOpen && (
        <AddExpenseModal
          currentMonth={currentMonth}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
