"use client";

import { useState } from "react";
import { createCreditCard, InstitutionOption } from "@/app/credit-cards/actions";
import { CardBrand } from "@/generated/prisma/enums";

interface AddCreditCardModalProps {
  institutions: InstitutionOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCreditCardModal({
  institutions,
  onClose,
  onSuccess,
}: AddCreditCardModalProps) {
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || "");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<CardBrand>("VISA");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!institutionId) {
      setError("institution is required");
      return;
    }

    if (!name.trim()) {
      setError("name is required");
      return;
    }

    const dueDayNum = parseInt(dueDay, 10);
    if (!dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError("due day must be between 1 and 31");
      return;
    }

    if (lastFourDigits && !/^\d{4}$/.test(lastFourDigits)) {
      setError("last 4 digits must be exactly 4 numbers");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCreditCard({
        institutionId,
        name: name.trim(),
        brand,
        lastFourDigits: lastFourDigits || undefined,
        dueDay: dueDayNum,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create credit card");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add credit card</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          <div className="space-y-1">
            <label htmlFor="institution" className="block text-sm text-[#737373]">
              institution
            </label>
            <select
              id="institution"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="e.g., Personal Visa"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="brand" className="block text-sm text-[#737373]">
              brand
            </label>
            <select
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value as CardBrand)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="VISA">Visa</option>
              <option value="MASTERCARD">Mastercard</option>
              <option value="AMEX">Amex</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="lastFourDigits" className="block text-sm text-[#737373]">
              last 4 digits (optional)
            </label>
            <input
              type="text"
              id="lastFourDigits"
              value={lastFourDigits}
              onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="1234"
              maxLength={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="dueDay" className="block text-sm text-[#737373]">
              due day
            </label>
            <input
              type="number"
              id="dueDay"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="15"
              min={1}
              max={31}
              disabled={isSubmitting}
            />
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
              {isSubmitting ? "adding..." : "add card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
