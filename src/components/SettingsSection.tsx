"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings, UserSettings } from "@/app/settings/actions";

interface SettingsSectionProps {
  settings: UserSettings;
}

export default function SettingsSection({ settings }: SettingsSectionProps) {
  const router = useRouter();
  const [usdToArsRate, setUsdToArsRate] = useState(settings.usdToArsRate.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const rate = parseFloat(usdToArsRate);
    if (isNaN(rate) || rate <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setIsSubmitting(true);

    const result = await updateSettings({ usdToArsRate: rate });

    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to save settings");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-[#171717] mb-6">settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
          <h2 className="text-sm font-medium text-[#171717] mb-4">currency conversion</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="usdToArsRate" className="block text-sm text-[#737373] mb-2">
                USD to ARS exchange rate
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#737373]">1 USD =</span>
                <input
                  type="number"
                  id="usdToArsRate"
                  value={usdToArsRate}
                  onChange={(e) => {
                    setUsdToArsRate(e.target.value);
                    setSuccess(false);
                  }}
                  step="0.01"
                  min="0.01"
                  className="flex-1 max-w-[150px] px-3 py-2 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  placeholder="1200"
                />
                <span className="text-sm text-[#737373]">ARS</span>
              </div>
              <p className="mt-2 text-xs text-[#a3a3a3]">
                This rate is used to show ARS equivalents for USD expenses on the dashboard.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {success && (
          <p className="text-sm text-green-600">Settings saved successfully</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm bg-[#171717] text-white rounded-lg hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isSubmitting ? "saving..." : "save settings"}
        </button>
      </form>
    </div>
  );
}
