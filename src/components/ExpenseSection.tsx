"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ExpenseList from "./ExpenseList";
import ExpenseTotals from "./ExpenseTotals";
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

  // Calculate totals from expenses
  const { paidTotal, unpaidTotal } = useMemo(() => {
    return expenses.reduce(
      (acc, expense) => {
        const amount = parseFloat(expense.amount);
        if (expense.isPaid) {
          acc.paidTotal += amount;
        } else {
          acc.unpaidTotal += amount;
        }
        return acc;
      },
      { paidTotal: 0, unpaidTotal: 0 }
    );
  }, [expenses]);

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
      alert(result.error || "failed to delete expense");
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
      alert(result.error || "failed to update paid status");
    }
  };

  return (
    <div className="space-y-6">
      <ExpenseTotals paidTotal={paidTotal} unpaidTotal={unpaidTotal} />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <span className="text-sm text-[#737373]">expenses</span>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsCloneModalOpen(true)}
            className="px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[44px]"
          >
            clone from previous
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[44px]"
          >
            add expense
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
