"use client";

import { useState } from "react";
import { createAccount } from "@/app/institutions/account-actions";
import { Currency } from "@/generated/prisma/enums";

interface AddAccountModalProps {
  institutionId: string;
  institutionName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAccountModal({
  institutionId,
  institutionName,
  onClose,
  onSuccess,
}: AddAccountModalProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAccount({
        institutionId,
        name: name.trim(),
        currency,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create account");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add account</h2>
          <p className="text-xs text-[#a3a3a3] mt-1">{institutionName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm text-[#737373]">
              name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="checking account..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="currency" className="block text-sm text-[#737373]">
              currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="ARS">ARS (Argentine Peso)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? "adding..." : "add account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
