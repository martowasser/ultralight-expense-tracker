"use client";

import { useState, useEffect } from "react";
import {
  Investment,
  checkInvestmentForDeletion,
  deleteInvestment,
} from "@/app/investments/actions";

interface DeleteInvestmentModalProps {
  investmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteInvestmentModal({
  investmentId,
  onClose,
  onSuccess,
}: DeleteInvestmentModalProps) {
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [hasDividends, setHasDividends] = useState(false);
  const [dividendCount, setDividendCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkInvestment() {
      setIsLoading(true);
      setError("");

      const result = await checkInvestmentForDeletion(investmentId);

      if (!result.success) {
        setError(result.error || "Failed to load investment");
        setIsLoading(false);
        return;
      }

      setInvestment(result.investment || null);
      setHasDividends(result.hasDividends || false);
      setDividendCount(result.dividendCount || 0);
      setIsLoading(false);
    }

    checkInvestment();
  }, [investmentId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    const result = await deleteInvestment(investmentId);

    if (!result.success) {
      setError(result.error || "Failed to delete investment");
      setIsDeleting(false);
      return;
    }

    onSuccess();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
        <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4">
          <div className="px-6 py-4 border-b border-[#e5e5e5]">
            <h2 className="text-sm text-[#171717]">delete investment</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-[#a3a3a3]">loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !investment) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
        <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4">
          <div className="px-6 py-4 border-b border-[#e5e5e5]">
            <h2 className="text-sm text-[#171717]">delete investment</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#737373]">{error}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[44px]"
              >
                close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCost = investment
    ? (parseFloat(investment.quantity) * parseFloat(investment.purchasePrice)).toFixed(2)
    : "0.00";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">delete investment</h2>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          <p className="text-sm text-[#171717]">
            are you sure you want to delete this investment?
          </p>

          {/* Investment Details */}
          {investment && (
            <div className="py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">asset</span>
                <span className="text-sm font-medium text-[#171717]">
                  {investment.asset.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">quantity</span>
                <span className="text-sm text-[#171717]">
                  {investment.quantity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">total cost</span>
                <span className="text-sm text-[#171717]">
                  {investment.purchaseCurrency} {totalCost}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">platform</span>
                <span className="text-sm text-[#171717]">
                  {investment.platform}
                </span>
              </div>
            </div>
          )}

          {/* Dividend Warning */}
          {hasDividends && (
            <div className="py-3 px-4 bg-[#fef3c7] border border-[#f59e0b] space-y-1">
              <p className="text-sm font-medium text-[#92400e]">
                warning: this investment has {dividendCount} dividend{dividendCount === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-[#92400e]">
                deleting this investment will also delete all associated dividend records.
              </p>
            </div>
          )}

          <p className="text-sm text-[#a3a3a3]">
            this action cannot be undone. the investment
            {hasDividends && ` and ${dividendCount} dividend${dividendCount === 1 ? "" : "s"}`} will be
            permanently deleted.
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
            >
              {isDeleting ? "deleting..." : "delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
