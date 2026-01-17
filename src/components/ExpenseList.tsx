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
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-center">
        <p className="text-gray-500">No expenses for {displayMonth}.</p>
        <p className="text-gray-400 text-sm mt-2">
          Add an expense or clone from the previous month to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {expenses.map((expense) => {
          const isToggling = togglingId === expense.id;
          return (
            <div
              key={expense.id}
              className={`bg-white rounded-lg shadow p-4 ${expense.isPaid ? "bg-green-50 border-l-4 border-green-500" : ""}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className={`font-medium text-base ${expense.isPaid ? "text-gray-500 line-through" : "text-gray-900"}`}>
                    {expense.expense.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Due: Day {expense.expense.dueDay}</p>
                </div>
                <p className={`text-lg font-semibold ${expense.isPaid ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  ${parseFloat(expense.amount).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <label className="inline-flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={expense.isPaid}
                    onChange={() => onTogglePaid(expense)}
                    disabled={isToggling}
                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer disabled:cursor-wait"
                  />
                  <span className={`ml-2 text-sm ${expense.isPaid ? "text-green-700 font-medium" : "text-gray-600"}`}>
                    {expense.isPaid ? "Paid" : "Pending"}
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(expense)}
                    className="px-3 py-2 min-h-[44px] text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(expense)}
                    className="px-3 py-2 min-h-[44px] text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
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
                    <label className="inline-flex items-center cursor-pointer min-h-[44px]">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEdit(expense)}
                        className="text-blue-600 hover:text-blue-800 font-medium min-h-[44px] px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(expense)}
                        className="text-red-600 hover:text-red-800 font-medium min-h-[44px] px-2"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
