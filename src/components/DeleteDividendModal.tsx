"use client";

import { useState } from "react";
import { Dividend, deleteDividend } from "@/app/investments/actions";
import { DIVIDEND_TYPES } from "@/app/investments/constants";
import { DividendType } from "@/generated/prisma/enums";

interface DeleteDividendModalProps {
  dividend: Dividend;
  onClose: () => void;
  onSuccess: () => void;
}

// Format dividend type for display
function formatDividendType(type: DividendType): string {
  const found = DIVIDEND_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

// Format currency amount
function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(num);
}

// Format date for display
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DeleteDividendModal({
  dividend,
  onClose,
  onSuccess,
}: DeleteDividendModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    const result = await deleteDividend(dividend.id);

    if (!result.success) {
      setError(result.error || "Failed to delete dividend");
      setIsDeleting(false);
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">delete dividend</h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-sm text-[#171717]">
            are you sure you want to delete this dividend record?
          </p>

          {/* Dividend Details */}
          <div className="py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#737373]">symbol</span>
              <span className="text-sm font-medium text-[#171717]">
                {dividend.investment.asset.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#737373]">amount</span>
              <span className="text-sm font-medium text-[#22c55e]">
                {formatAmount(dividend.amount, dividend.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#737373]">date</span>
              <span className="text-sm text-[#171717]">
                {formatDate(dividend.paymentDate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#737373]">type</span>
              <span className="text-sm text-[#171717]">
                {formatDividendType(dividend.type)}
              </span>
            </div>
            {dividend.isReinvested && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#737373]">reinvested</span>
                <span className="text-sm text-[#22c55e]">yes</span>
              </div>
            )}
          </div>

          <p className="text-sm text-[#a3a3a3]">
            this action cannot be undone. the dividend record will be
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
