import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import InstitutionSection from "@/components/InstitutionSection";
import { getInstitutions } from "./actions";

export default async function InstitutionsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const institutions = await getInstitutions();

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
        <InstitutionSection institutions={institutions} />
      </main>
    </div>
  );
}
