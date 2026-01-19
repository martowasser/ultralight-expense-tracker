"use client";

import { useState } from "react";
import { Institution, updateInstitution } from "@/app/institutions/actions";
import { InstitutionType } from "@/generated/prisma/enums";

interface EditInstitutionModalProps {
  institution: Institution;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditInstitutionModal({
  institution,
  onClose,
  onSuccess,
}: EditInstitutionModalProps) {
  const [name, setName] = useState(institution.name);
  const [type, setType] = useState<InstitutionType>(institution.type);
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
      const result = await updateInstitution({
        institutionId: institution.id,
        name: name.trim(),
        type,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to update institution");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">edit institution</h2>
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
              placeholder="your bank name..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="type" className="block text-sm text-[#737373]">
              type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as InstitutionType)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="BANK">Bank</option>
              <option value="FINTECH">Fintech</option>
              <option value="CRYPTO_EXCHANGE">Crypto Exchange</option>
              <option value="PAYMENT_PLATFORM">Payment Platform</option>
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
              {isSubmitting ? "saving..." : "save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
