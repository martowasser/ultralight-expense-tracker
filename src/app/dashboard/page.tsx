import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import MonthNavigation from "@/components/MonthNavigation";
import ExpenseSection from "@/components/ExpenseSection";
import { getMonthlyExpenses } from "./actions";

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isValidMonthFormat(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const monthParam = params.month;

  // Validate and use month from URL, or default to current month
  const selectedMonth = monthParam && isValidMonthFormat(monthParam)
    ? monthParam
    : getCurrentMonth();

  // If no month param or invalid, redirect to include month in URL
  if (!monthParam || !isValidMonthFormat(monthParam)) {
    redirect(`/dashboard?month=${selectedMonth}`);
  }

  const displayMonth = formatMonthDisplay(selectedMonth);
  const expenses = await getMonthlyExpenses(selectedMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <MonthNavigation currentMonth={selectedMonth} displayMonth={displayMonth} />
        </div>
        <ExpenseSection expenses={expenses} currentMonth={selectedMonth} displayMonth={displayMonth} />
      </main>
    </div>
  );
}
