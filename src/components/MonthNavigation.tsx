"use client";

import { useRouter } from "next/navigation";

interface MonthNavigationProps {
  currentMonth: string; // YYYY-MM format
  displayMonth: string; // Human readable format like "January 2026"
}

function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() - 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

function getNextMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() + 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

export default function MonthNavigation({ currentMonth, displayMonth }: MonthNavigationProps) {
  const router = useRouter();

  const handlePrevious = () => {
    const prevMonth = getPreviousMonth(currentMonth);
    router.push(`/dashboard?month=${prevMonth}`);
  };

  const handleNext = () => {
    const nextMonth = getNextMonth(currentMonth);
    router.push(`/dashboard?month=${nextMonth}`);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      <button
        onClick={handlePrevious}
        className="p-3 sm:px-4 sm:py-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Previous month"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-[140px] sm:min-w-[200px] text-center">
        {displayMonth}
      </h2>
      <button
        onClick={handleNext}
        className="p-3 sm:px-4 sm:py-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Next month"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
