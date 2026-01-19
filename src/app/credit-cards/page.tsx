import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import CreditCardSection from "@/components/CreditCardSection";
import { getCreditCards, getInstitutionsForSelect } from "./actions";

export default async function CreditCardsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const [creditCards, institutions] = await Promise.all([
    getCreditCards(),
    getInstitutionsForSelect(),
  ]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
        <CreditCardSection creditCards={creditCards} institutions={institutions} />
      </main>
    </div>
  );
}
