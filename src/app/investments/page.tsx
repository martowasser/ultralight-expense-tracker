import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import AssetLibrarySection from "@/components/AssetLibrarySection";
import { getAssets, getInvestments } from "./actions";

export default async function InvestmentsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const [assetsResult, investmentsResult] = await Promise.all([
    getAssets(),
    getInvestments(),
  ]);

  const assets = assetsResult.success && assetsResult.assets ? assetsResult.assets : [];
  const investments = investmentsResult.success && investmentsResult.investments ? investmentsResult.investments : [];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
        <AssetLibrarySection initialAssets={assets} initialInvestments={investments} />
      </main>
    </div>
  );
}
