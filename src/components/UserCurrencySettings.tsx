"use client";

import { useState, useEffect } from "react";
import { Currency } from "@/generated/prisma/enums";
import {
  UserSettings,
  getUserSettings,
  updateDisplayCurrency,
  updatePreferredCurrencies,
} from "@/app/investments/actions";
import { CURRENCIES, CURRENCY_INFO } from "@/app/investments/constants";

interface UserCurrencySettingsProps {
  onSettingsChange?: (settings: UserSettings) => void;
}

export default function UserCurrencySettings({ onSettingsChange }: UserCurrencySettingsProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const result = await getUserSettings();
      if (result.success && result.settings) {
        setSettings(result.settings);
      } else {
        setError(result.error || "Failed to load settings");
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleDisplayCurrencyChange = async (currency: Currency) => {
    if (!settings || isUpdating) return;

    setIsUpdating(true);
    setError(null);

    const result = await updateDisplayCurrency(currency);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setSuccessMessage("Display currency updated");
      onSettingsChange?.(result.settings);
    } else {
      setError(result.error || "Failed to update display currency");
    }

    setIsUpdating(false);
  };

  const handlePreferredCurrencyToggle = async (currency: string) => {
    if (!settings || isUpdating) return;

    const currentPreferred = settings.preferredCurrencies;
    let newPreferred: string[];

    if (currentPreferred.includes(currency)) {
      // Remove currency (but keep at least one)
      if (currentPreferred.length <= 1) {
        setError("At least one preferred currency is required");
        return;
      }
      newPreferred = currentPreferred.filter((c) => c !== currency);
    } else {
      // Add currency
      newPreferred = [...currentPreferred, currency];
    }

    setIsUpdating(true);
    setError(null);

    const result = await updatePreferredCurrencies(newPreferred);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setSuccessMessage("Preferred currencies updated");
      onSettingsChange?.(result.settings);
    } else {
      setError(result.error || "Failed to update preferred currencies");
    }

    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-[#a3a3a3]">loading settings...</div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="relative">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[40px]"
        title="Currency settings"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>settings</span>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e5e5e5] shadow-lg z-50">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#171717]">currency settings</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#a3a3a3] hover:text-[#171717]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-3 py-2 text-sm text-red-800 bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="px-3 py-2 text-sm text-green-800 bg-green-50 border border-green-200">
                  {successMessage}
                </div>
              )}

              {/* Display Currency */}
              <div className="space-y-2">
                <label className="text-xs text-[#737373] uppercase tracking-wider">
                  display currency
                </label>
                <select
                  value={settings.displayCurrency}
                  onChange={(e) => handleDisplayCurrencyChange(e.target.value as Currency)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-sm text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none disabled:opacity-50"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {CURRENCY_INFO[currency]?.symbol || ""} {currency} - {CURRENCY_INFO[currency]?.name || currency}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#a3a3a3]">
                  portfolio values will be displayed in this currency
                </p>
              </div>

              {/* Preferred Currencies */}
              <div className="space-y-2">
                <label className="text-xs text-[#737373] uppercase tracking-wider">
                  preferred currencies
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map((currency) => {
                    const isPreferred = settings.preferredCurrencies.includes(currency);
                    return (
                      <button
                        key={currency}
                        onClick={() => handlePreferredCurrencyToggle(currency)}
                        disabled={isUpdating}
                        className={`px-3 py-2 text-sm text-left border transition-colors disabled:opacity-50 ${
                          isPreferred
                            ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                            : "bg-white text-[#737373] border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
                        }`}
                      >
                        <span className="font-medium">{currency}</span>
                        <span className="ml-1 text-xs opacity-70">
                          {CURRENCY_INFO[currency]?.symbol || ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#a3a3a3]">
                  select currencies you frequently use for investments
                </p>
              </div>

              {/* Loading Indicator */}
              {isUpdating && (
                <div className="flex items-center justify-center py-2">
                  <svg
                    className="w-4 h-4 animate-spin text-[#737373]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="ml-2 text-xs text-[#737373]">saving...</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
