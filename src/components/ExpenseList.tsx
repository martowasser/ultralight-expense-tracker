import { MonthlyExpenseWithExpense } from "@/app/dashboard/actions";

interface ExpenseListProps {
  expenses: MonthlyExpenseWithExpense[];
  displayMonth: string;
  onEdit: (expense: MonthlyExpenseWithExpense) => void;
  onDelete: (expense: MonthlyExpenseWithExpense) => void;
  onTogglePaid: (expense: MonthlyExpenseWithExpense) => void;
  togglingId: string | null;
}

export default function ExpenseList({ expenses, displayMonth, onEdit, onDelete, onTogglePaid, togglingId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No expenses for {displayMonth}.</p>
        <p className="text-gray-400 text-sm mt-2">
          Add an expense or clone from the previous month to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Day
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.map((expense) => {
            const isToggling = togglingId === expense.id;
            return (
              <tr key={expense.id} className={expense.isPaid ? "bg-green-50" : ""}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${expense.isPaid ? "text-gray-500 line-through" : "text-gray-900"}`}>
                  {expense.expense.name}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${expense.isPaid ? "text-gray-400 line-through" : "text-gray-500"}`}>
                  ${parseFloat(expense.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {expense.expense.dueDay}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expense.isPaid}
                      onChange={() => onTogglePaid(expense)}
                      disabled={isToggling}
                      className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer disabled:cursor-wait"
                    />
                    <span className={`ml-2 ${expense.isPaid ? "text-green-700 font-medium" : "text-gray-600"}`}>
                      {expense.isPaid ? "✓ Paid" : "Pending"}
                    </span>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <button
                    onClick={() => onEdit(expense)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(expense)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
