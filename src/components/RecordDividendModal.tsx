"use client";

import { useState, useMemo } from "react";
import { Investment, createDividend } from "@/app/investments/actions";
import { CURRENCIES, DIVIDEND_TYPES } from "@/app/investments/constants";
import { Currency, DividendType } from "@/generated/prisma/enums";

interface RecordDividendModalProps {
  investments: Investment[];
  onClose: () => void;
  onSuccess: () => void;
}

// Group investments by symbol for easier selection
interface HoldingOption {
  symbol: string;
  assetName: string;
  investments: Investment[];
}

export default function RecordDividendModal({
  investments,
  onClose,
  onSuccess,
}: RecordDividendModalProps) {
  // Form fields
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dividendType, setDividendType] = useState<DividendType>("REGULAR");
  const [isReinvested, setIsReinvested] = useState(false);
  const [notes, setNotes] = useState("");

  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group investments by symbol for the dropdown
  const holdingOptions = useMemo<HoldingOption[]>(() => {
    const grouped = new Map<string, HoldingOption>();

    investments.forEach((inv) => {
      const existing = grouped.get(inv.asset.symbol);
      if (existing) {
        existing.investments.push(inv);
      } else {
        grouped.set(inv.asset.symbol, {
          symbol: inv.asset.symbol,
          assetName: inv.asset.name,
          investments: [inv],
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );
  }, [investments]);

  // Get the selected investment for display
  const selectedInvestment = useMemo(() => {
    return investments.find((inv) => inv.id === selectedInvestmentId);
  }, [investments, selectedInvestmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedInvestmentId) {
      setError("please select a holding");
      return;
    }

    if (!amount.trim()) {
      setError("please enter the dividend amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createDividend({
        investmentId: selectedInvestmentId,
        amount,
        currency,
        paymentDate,
        type: dividendType,
        isReinvested,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "failed to record dividend");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to record dividend");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[480px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">record dividend</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          {/* Holding Selection */}
          <div className="space-y-1">
            <label htmlFor="holding" className="block text-sm text-[#737373]">
              holding/symbol <span className="text-[#a3a3a3]">*</span>
            </label>
            <select
              id="holding"
              value={selectedInvestmentId}
              onChange={(e) => setSelectedInvestmentId(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="">select a holding</option>
              {holdingOptions.map((holding) => (
                <optgroup key={holding.symbol} label={`${holding.symbol} - ${holding.assetName}`}>
                  {holding.investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {holding.symbol} - {parseFloat(inv.quantity).toFixed(4)} units @ {inv.platform}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedInvestment && (
              <p className="text-xs text-[#a3a3a3]">
                purchased {new Date(selectedInvestment.purchaseDate).toLocaleDateString()} on {selectedInvestment.platform}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label htmlFor="amount" className="block text-sm text-[#737373]">
              amount received <span className="text-[#a3a3a3]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                className="flex-1 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
                disabled={isSubmitting}
              />
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
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

          {/* Payment Date */}
          <div className="space-y-1">
            <label htmlFor="paymentDate" className="block text-sm text-[#737373]">
              payment date <span className="text-[#a3a3a3]">*</span>
            </label>
            <input
              type="date"
              id="paymentDate"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Dividend Type */}
          <div className="space-y-1">
            <label htmlFor="dividendType" className="block text-sm text-[#737373]">
              dividend type <span className="text-[#a3a3a3]">*</span>
            </label>
            <select
              id="dividendType"
              value={dividendType}
              onChange={(e) => setDividendType(e.target.value as DividendType)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              {DIVIDEND_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#a3a3a3]">
              {dividendType === "REGULAR" && "standard periodic dividend payment"}
              {dividendType === "SPECIAL" && "one-time special dividend distribution"}
              {dividendType === "CAPITAL_GAIN" && "capital gains distribution from funds"}
            </p>
          </div>

          {/* Reinvested Toggle */}
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setIsReinvested(!isReinvested)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isReinvested ? "bg-[#171717]" : "bg-[#e5e5e5]"
              }`}
              disabled={isSubmitting}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isReinvested ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label className="text-sm text-[#171717]">
              dividend was reinvested
            </label>
          </div>
          {isReinvested && (
            <p className="text-xs text-[#a3a3a3] -mt-4">
              tip: if you reinvested, consider adding a new investment entry for the shares purchased
            </p>
          )}

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
              {isSubmitting ? "recording..." : "record dividend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
