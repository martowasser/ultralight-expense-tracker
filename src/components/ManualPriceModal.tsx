"use client";

import { useState, useEffect } from "react";
import { Asset, CachedPrice, setManualPrice } from "@/app/investments/actions";

interface ManualPriceModalProps {
  asset: Asset;
  currentPrice?: CachedPrice;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualPriceModal({
  asset,
  currentPrice,
  onClose,
  onSuccess,
}: ManualPriceModalProps) {
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate with current price if it exists
  useEffect(() => {
    if (currentPrice && currentPrice.source === "manual") {
      setPrice(currentPrice.price);
    }
  }, [currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await setManualPrice({
        assetId: asset.id,
        price: price,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to set price");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-base font-medium text-[#171717]">set manual price</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="px-4 py-3 text-sm text-red-800 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* Asset Info */}
          <div className="p-4 bg-[#fafafa] border border-[#e5e5e5]">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-[#171717]">{asset.symbol}</span>
              <span className="text-xs text-[#fafafa] px-1.5 py-0.5 bg-[#737373] rounded">
                custom
              </span>
            </div>
            <p className="text-sm text-[#737373]">{asset.name}</p>
            {currentPrice && (
              <p className="text-xs text-[#a3a3a3] mt-2">
                current price: ${currentPrice.price}
                {currentPrice.source === "manual" && " (manually set)"}
              </p>
            )}
          </div>

          {/* Price Input */}
          <div>
            <label htmlFor="price" className="block text-sm text-[#737373] mb-1">
              price (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]">$</span>
              <input
                id="price"
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-3 text-sm text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                required
              />
            </div>
            <p className="text-xs text-[#a3a3a3] mt-1">
              enter the current market price for this asset
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <p className="font-medium mb-1">about manual prices</p>
            <p>
              manual prices are used for custom assets that don&apos;t have automated price feeds.
              you can update this price anytime to reflect the current market value.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !price}
              className="flex-1 px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "saving..." : "save price"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
