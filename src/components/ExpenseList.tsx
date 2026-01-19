import { MonthlyExpenseWithExpense } from "@/app/dashboard/actions";
import { ExpenseCategory } from "@/app/dashboard/types";

interface ExpenseListProps {
  expenses: MonthlyExpenseWithExpense[];
  displayMonth: string;
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

export default function ExpenseList({ expenses, displayMonth, onEdit, onDelete, onTogglePaid, togglingId }: ExpenseListProps) {
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

  const formatARS = (amount: number): string => {
    return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUSD = (amount: number): string => {
    return `US$${amount.toFixed(2)}`;
  };

  const formatAmount = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (currency === "USD") {
      return formatUSD(num);
    }
    return formatARS(num);
  };

  // Separate expenses by currency
  const arsExpenses = expenses.filter((e) => e.expense.currency === "ARS");
  const usdExpenses = expenses.filter((e) => e.expense.currency === "USD");

  // Group expenses by category for a given list
  const groupByCategory = (expenseList: MonthlyExpenseWithExpense[]) => {
    return expenseList.reduce((acc, expense) => {
      const category = expense.expense.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(expense);
      return acc;
    }, {} as Record<ExpenseCategory, MonthlyExpenseWithExpense[]>);
  };

  // Calculate subtotal for a category (single currency)
  const categorySubtotal = (categoryExpenses: MonthlyExpenseWithExpense[]): number => {
    return categoryExpenses.reduce((acc, exp) => acc + parseFloat(exp.amount), 0);
  };

  // Calculate totals for a currency section
  const sectionTotals = (expenseList: MonthlyExpenseWithExpense[]) => {
    return expenseList.reduce(
      (acc, exp) => {
        const amount = parseFloat(exp.amount);
        if (exp.isPaid) {
          acc.paid += amount;
        } else {
          acc.unpaid += amount;
        }
        return acc;
      },
      { paid: 0, unpaid: 0 }
    );
  };

  // Render a single expense item
  const renderExpenseItem = (expense: MonthlyExpenseWithExpense) => {
    const isToggling = togglingId === expense.id;
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
  };

  // Render a currency section with its categories and totals
  const renderCurrencySection = (
    expenseList: MonthlyExpenseWithExpense[],
    currency: "ARS" | "USD",
    formatter: (amount: number) => string
  ) => {
    if (expenseList.length === 0) return null;

    const grouped = groupByCategory(expenseList);
    const totals = sectionTotals(expenseList);
    const total = totals.paid + totals.unpaid;

    return (
      <div className="space-y-6">
        {/* Currency section header with totals */}
        <div className="py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm font-medium text-[#171717] mb-3">
            {currency === "ARS" ? "ARS expenses" : "USD expenses"}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#a3a3a3]">paid</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">{formatter(totals.paid)}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3a3a3]">unpaid</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">{formatter(totals.unpaid)}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3a3a3]">total</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">{formatter(total)}</p>
            </div>
          </div>
        </div>

        {/* Categories within this currency */}
        {CATEGORY_ORDER.filter((category) => grouped[category]?.length > 0).map((category) => {
          const categoryExpenses = grouped[category];
          const subtotal = categorySubtotal(categoryExpenses);

          return (
            <div key={category}>
              <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                <h3 className="text-sm text-[#737373]">{CATEGORY_LABELS[category]}</h3>
                <span className="text-xs text-[#a3a3a3] tabular-nums">
                  {formatter(subtotal)}
                </span>
              </div>
              <div className="space-y-1">
                {categoryExpenses.map(renderExpenseItem)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderCurrencySection(arsExpenses, "ARS", formatARS)}
      {renderCurrencySection(usdExpenses, "USD", formatUSD)}
    </div>
  );
}
