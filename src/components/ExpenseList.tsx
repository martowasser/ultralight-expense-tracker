import { MonthlyExpenseWithExpense, ExpenseCategory } from "@/app/dashboard/actions";

interface ExpenseListProps {
  expenses: MonthlyExpenseWithExpense[];
  displayMonth: string;
  exchangeRate: number;
  onEdit: (expense: MonthlyExpenseWithExpense) => void;
  onDelete: (expense: MonthlyExpenseWithExpense) => void;
  onTogglePaid: (expense: MonthlyExpenseWithExpense) => void;
  togglingId: string | null;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  CREDIT_CARD: "credit card",
  SERVICE: "service",
  RENT: "rent",
  INSURANCE: "insurance",
  TAX: "tax",
  SUBSCRIPTION: "subscription",
  BUILDING_FEE: "building fee",
  OTHER: "other",
};

const CATEGORY_ORDER: ExpenseCategory[] = [
  "CREDIT_CARD",
  "SERVICE",
  "RENT",
  "INSURANCE",
  "TAX",
  "SUBSCRIPTION",
  "BUILDING_FEE",
  "OTHER",
];

interface CategorySubtotals {
  ars: number;
  usd: number;
}

export default function ExpenseList({ expenses, displayMonth, exchangeRate, onEdit, onDelete, onTogglePaid, togglingId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#a3a3a3]">no expenses for {displayMonth}</p>
        <p className="text-sm text-[#a3a3a3] mt-1">
          add an expense or clone from the previous month
        </p>
      </div>
    );
  }

  const formatAmount = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (currency === "USD") {
      return `US$${num.toFixed(2)}`;
    }
    return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getArsEquivalent = (amount: string): string => {
    const usdAmount = parseFloat(amount);
    const arsAmount = usdAmount * exchangeRate;
    return `≈ $${arsAmount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ARS`;
  };

  // Group expenses by category
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const category = expense.expense.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(expense);
    return acc;
  }, {} as Record<ExpenseCategory, MonthlyExpenseWithExpense[]>);

  // Calculate subtotals for each category
  const categorySubtotals = (categoryExpenses: MonthlyExpenseWithExpense[]): CategorySubtotals => {
    return categoryExpenses.reduce(
      (acc, exp) => {
        const amount = parseFloat(exp.amount);
        if (exp.expense.currency === "USD") {
          acc.usd += amount;
        } else {
          acc.ars += amount;
        }
        return acc;
      },
      { ars: 0, usd: 0 }
    );
  };

  const formatSubtotal = (subtotals: CategorySubtotals): string => {
    const parts: string[] = [];
    if (subtotals.ars > 0) {
      parts.push(`$${subtotals.ars.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    if (subtotals.usd > 0) {
      parts.push(`US$${subtotals.usd.toFixed(2)}`);
    }
    return parts.join(" + ");
  };

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.filter((category) => groupedExpenses[category]?.length > 0).map((category) => {
        const categoryExpenses = groupedExpenses[category];
        const subtotals = categorySubtotals(categoryExpenses);

        return (
          <div key={category}>
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <h3 className="text-sm text-[#737373]">{CATEGORY_LABELS[category]}</h3>
              <span className="text-xs text-[#a3a3a3] tabular-nums">
                {formatSubtotal(subtotals)}
              </span>
            </div>
            <div className="space-y-1">
              {categoryExpenses.map((expense) => {
                const isToggling = togglingId === expense.id;
                const isUSD = expense.expense.currency === "USD";
                return (
                  <div
                    key={expense.id}
                    className={`py-4 border-b border-[#e5e5e5] last:border-b-0 ${expense.isPaid ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <label className="inline-flex items-center cursor-pointer min-h-[44px] min-w-[44px] justify-center -ml-3">
                          <input
                            type="checkbox"
                            checked={expense.isPaid}
                            onChange={() => onTogglePaid(expense)}
                            disabled={isToggling}
                            className="h-4 w-4 text-[#171717] border-[#e5e5e5] rounded-sm focus:ring-0 cursor-pointer disabled:cursor-wait accent-[#171717]"
                          />
                        </label>
                        <div className="flex-1 min-w-0 pt-2.5">
                          <p className={`text-sm ${expense.isPaid ? "text-[#a3a3a3] line-through" : "text-[#171717]"}`}>
                            {expense.expense.name}
                          </p>
                          <p className="text-xs text-[#a3a3a3] mt-0.5">
                            due day {expense.expense.dueDay}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-2.5">
                        <div className="text-right">
                          <p className={`text-sm tabular-nums ${expense.isPaid ? "text-[#a3a3a3] line-through" : "text-[#171717]"}`}>
                            {formatAmount(expense.amount, expense.expense.currency)}
                          </p>
                          {isUSD && (
                            <p className="text-xs text-[#a3a3a3] mt-0.5">
                              {getArsEquivalent(expense.amount)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(expense)}
                            className="text-sm text-[#a3a3a3] hover:text-[#171717] min-h-[44px] px-1"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => onDelete(expense)}
                            className="text-sm text-[#a3a3a3] hover:text-[#171717] min-h-[44px] px-1"
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
