import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[640px] text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-xl font-normal text-[#171717] lowercase">
            monthly expense tracker
          </h1>
          <p className="text-sm text-[#737373]">
            track your recurring monthly expenses
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/login"
            className="btn px-6 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[44px] flex items-center justify-center no-underline"
          >
            login
          </Link>
          <Link
            href="/register"
            className="btn px-6 py-3 text-sm text-[#171717] border border-[#e5e5e5] hover:border-[#a3a3a3] min-h-[44px] flex items-center justify-center no-underline"
          >
            register
          </Link>
        </div>
      </div>
    </main>
  );
}
