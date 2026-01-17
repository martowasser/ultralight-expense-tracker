"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExpenseList from "./ExpenseList";
import AddExpenseModal from "./AddExpenseModal";
import EditExpenseModal from "./EditExpenseModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CloneExpensesModal from "./CloneExpensesModal";
import { MonthlyExpenseWithExpense, deleteExpense, togglePaid } from "@/app/dashboard/actions";

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpenseWithExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<MonthlyExpenseWithExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    router.refresh();
  };

  const handleCloneSuccess = () => {
    setIsCloneModalOpen(false);
    router.refresh();
  };

  const handleEditSuccess = () => {
    setEditingExpense(null);
    router.refresh();
  };

  const handleEdit = (expense: MonthlyExpenseWithExpense) => {
    setEditingExpense(expense);
  };

  const handleDelete = (expense: MonthlyExpenseWithExpense) => {
    setDeletingExpense(expense);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    const result = await deleteExpense({ expenseId: deletingExpense.expenseId });
    setIsDeleting(false);

    if (result.success) {
      setDeletingExpense(null);
      router.refresh();
    } else {
      alert(result.error || "Failed to delete expense");
    }
  };

  const handleTogglePaid = async (expense: MonthlyExpenseWithExpense) => {
    setTogglingId(expense.id);
    const result = await togglePaid({
      monthlyExpenseId: expense.id,
      isPaid: !expense.isPaid,
    });
    setTogglingId(null);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to update paid status");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCloneModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clone from Previous Month
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Expense
          </button>
        </div>
      </div>

      <ExpenseList
        expenses={expenses}
        displayMonth={displayMonth}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePaid={handleTogglePaid}
        togglingId={togglingId}
      />

      {isAddModalOpen && (
        <AddExpenseModal
          currentMonth={currentMonth}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingExpense && (
        <DeleteConfirmModal
          expenseName={deletingExpense.expense.name}
          isDeleting={isDeleting}
          onClose={() => setDeletingExpense(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {isCloneModalOpen && (
        <CloneExpensesModal
          currentMonth={currentMonth}
          onClose={() => setIsCloneModalOpen(false)}
          onSuccess={handleCloneSuccess}
        />
      )}
    </div>
  );
}
