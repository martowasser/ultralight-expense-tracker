"use client";

import { useState } from "react";
import { createCustomAsset } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

interface CreateCustomAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ASSET_TYPES: { value: AssetType; label: string; defaultPrecision: number }[] = [
  { value: "CRYPTO", label: "crypto", defaultPrecision: 6 },
  { value: "STOCK", label: "stock", defaultPrecision: 2 },
  { value: "ETF", label: "etf", defaultPrecision: 2 },
];

export default function CreateCustomAssetModal({
  onClose,
  onSuccess,
}: CreateCustomAssetModalProps) {
  // Form fields
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("STOCK");
  const [precision, setPrecision] = useState(2);

  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle type change - update precision to default for that type
  const handleTypeChange = (newType: AssetType) => {
    setType(newType);
    const typeConfig = ASSET_TYPES.find((t) => t.value === newType);
    if (typeConfig) {
      setPrecision(typeConfig.defaultPrecision);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!symbol.trim()) {
      setError("please enter a symbol");
      return;
    }

    if (!name.trim()) {
      setError("please enter a name");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCustomAsset({
        symbol: symbol.trim(),
        name: name.trim(),
        type,
        precision,
      });

      if (!result.success) {
        setError(result.error || "failed to create asset");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create asset");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[480px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">create custom asset</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          {/* Symbol */}
          <div className="space-y-1">
            <label htmlFor="symbol" className="block text-sm text-[#737373]">
              symbol <span className="text-[#a3a3a3]">*</span>
            </label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none uppercase"
              placeholder="e.g., MYASSET"
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="text-xs text-[#a3a3a3]">
              1-10 alphanumeric characters, must be unique
            </p>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm text-[#737373]">
              name <span className="text-[#a3a3a3]">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="e.g., My Custom Asset"
              disabled={isSubmitting}
            />
          </div>

          {/* Asset Type */}
          <div className="space-y-1">
            <label className="block text-sm text-[#737373]">
              type <span className="text-[#a3a3a3]">*</span>
            </label>
            <div className="flex gap-1">
              {ASSET_TYPES.map((assetType) => (
                <button
                  key={assetType.value}
                  type="button"
                  onClick={() => handleTypeChange(assetType.value)}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-3 text-sm min-h-[44px] border ${
                    type === assetType.value
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  } disabled:opacity-50`}
                >
                  {assetType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Precision */}
          <div className="space-y-1">
            <label htmlFor="precision" className="block text-sm text-[#737373]">
              quantity precision <span className="text-[#a3a3a3]">*</span>
            </label>
            <select
              id="precision"
              value={precision}
              onChange={(e) => setPrecision(parseInt(e.target.value))}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              <option value={0}>0 decimal places (whole units)</option>
              <option value={2}>2 decimal places (standard)</option>
              <option value={4}>4 decimal places</option>
              <option value={6}>6 decimal places (crypto)</option>
              <option value={8}>8 decimal places (high precision)</option>
            </select>
            <p className="text-xs text-[#a3a3a3]">
              how many decimal places for quantities (e.g., 6 for 0.000001)
            </p>
          </div>

          {/* Info Box */}
          <div className="py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5]">
            <p className="text-xs text-[#737373]">
              custom assets appear only in your library and support manual price entry.
              automated price fetching is not available for custom assets.
            </p>
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
              {isSubmitting ? "creating..." : "create asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
