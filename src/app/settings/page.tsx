import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import SettingsSection from "@/components/SettingsSection";
import { getUserSettings } from "./actions";

export default async function SettingsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const settings = await getUserSettings();

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header userEmail={session.user.email || ""} />
      <main className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
        <SettingsSection settings={settings} />
      </main>
    </div>
  );
}
