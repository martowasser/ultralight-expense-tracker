"use client";

import { useState, useMemo } from "react";
import { Investment, updateInvestment } from "@/app/investments/actions";
import { PLATFORMS, CURRENCIES } from "@/app/investments/constants";
import { Currency } from "@/generated/prisma/enums";

interface EditInvestmentModalProps {
  investment: Investment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditInvestmentModal({
  investment,
  onClose,
  onSuccess,
}: EditInvestmentModalProps) {
  // Form fields pre-populated with current values
  const [quantity, setQuantity] = useState(investment.quantity);
  const [purchasePrice, setPurchasePrice] = useState(investment.purchasePrice);
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>(
    investment.purchaseCurrency
  );
  const [purchaseDate, setPurchaseDate] = useState(
    new Date(investment.purchaseDate).toISOString().split("T")[0]
  );

  // Determine if platform is a known platform or custom
  const isKnownPlatform = (PLATFORMS as readonly string[]).includes(investment.platform);
  const [platform, setPlatform] = useState(
    isKnownPlatform ? investment.platform : "Other"
  );
  const [customPlatform, setCustomPlatform] = useState(
    isKnownPlatform ? "" : investment.platform
  );
  const [notes, setNotes] = useState(investment.notes || "");

  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total cost
  const totalCost = useMemo(() => {
    const qty = parseFloat(quantity);
    const price = parseFloat(purchasePrice);
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      return (qty * price).toFixed(2);
    }
    return null;
  }, [quantity, purchasePrice]);

  // Get quantity step based on asset precision
  const quantityStep = useMemo(() => {
    return Math.pow(10, -investment.asset.precision).toString();
  }, [investment.asset.precision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const effectivePlatform = platform === "Other" ? customPlatform : platform;
    if (!effectivePlatform.trim()) {
      setError("please select or enter a platform");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateInvestment({
        id: investment.id,
        quantity,
        purchasePrice,
        purchaseCurrency,
        purchaseDate,
        platform: effectivePlatform.trim(),
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "failed to update investment");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to update investment");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[480px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">edit investment</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          {/* Asset Display (read-only) */}
          <div className="space-y-1">
            <label className="block text-sm text-[#737373]">asset</label>
            <div className="w-full px-3 py-3 text-base text-[#171717] bg-[#f5f5f5] border border-[#e5e5e5]">
              <div className="flex justify-between items-center">
                <span className="font-medium">{investment.asset.symbol}</span>
                <span className="text-sm text-[#737373]">
                  {investment.asset.name}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#a3a3a3]">
              {investment.asset.type.toLowerCase()} - cannot be changed
            </p>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label htmlFor="quantity" className="block text-sm text-[#737373]">
              quantity <span className="text-[#a3a3a3]">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step={quantityStep}
              min="0"
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder={
                investment.asset.precision === 6 ? "0.000001" : "0.00"
              }
              disabled={isSubmitting}
            />
            <p className="text-xs text-[#a3a3a3]">
              max {investment.asset.precision} decimal places for{" "}
              {investment.asset.type === "CRYPTO" ? "crypto" : "stocks/ETFs"}
            </p>
          </div>

          {/* Purchase Price */}
          <div className="space-y-1">
            <label
              htmlFor="purchasePrice"
              className="block text-sm text-[#737373]"
            >
              purchase price <span className="text-[#a3a3a3]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="purchasePrice"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                step="0.01"
                min="0"
                className="flex-1 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
                disabled={isSubmitting}
              />
              <select
                id="purchaseCurrency"
                value={purchaseCurrency}
                onChange={(e) =>
                  setPurchaseCurrency(e.target.value as Currency)
                }
                className="w-24 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                disabled={isSubmitting}
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total Cost (calculated) */}
          {totalCost && (
            <div className="py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">total cost</span>
                <span className="text-sm font-medium text-[#171717]">
                  {purchaseCurrency} {totalCost}
                </span>
              </div>
            </div>
          )}

          {/* Purchase Date */}
          <div className="space-y-1">
            <label
              htmlFor="purchaseDate"
              className="block text-sm text-[#737373]"
            >
              purchase date <span className="text-[#a3a3a3]">*</span>
            </label>
            <input
              type="date"
              id="purchaseDate"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Platform */}
          <div className="space-y-1">
            <label htmlFor="platform" className="block text-sm text-[#737373]">
              platform/brokerage <span className="text-[#a3a3a3]">*</span>
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                if (e.target.value !== "Other") {
                  setCustomPlatform("");
                }
              }}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="">select platform</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {platform === "Other" && (
              <input
                type="text"
                id="customPlatform"
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                className="w-full mt-2 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="enter platform name"
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* Notes (optional) */}
          <div className="space-y-1">
            <label htmlFor="notes" className="block text-sm text-[#737373]">
              notes <span className="text-[#a3a3a3]">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none resize-none"
              placeholder="additional notes..."
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
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
