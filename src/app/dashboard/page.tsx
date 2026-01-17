import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-2 text-gray-600">
          Welcome to your expense tracker dashboard.
        </p>
      </main>
    </div>
  );
}
