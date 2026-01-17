import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:p-24">
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 text-center">
        Monthly Expense Tracker
      </h1>
      <p className="mt-4 text-base sm:text-lg text-gray-600 text-center">
        Track your recurring monthly expenses
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md">
        <Link
          href="/login"
          className="flex-1 flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] items-center"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="flex-1 flex justify-center py-3 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] items-center"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
