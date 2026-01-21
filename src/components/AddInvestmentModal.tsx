"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Asset,
  getAssets,
  createInvestment,
} from "@/app/investments/actions";
import { PLATFORMS, CURRENCIES } from "@/app/investments/constants";
import { Currency } from "@/generated/prisma/enums";

interface AddInvestmentModalProps {
  initialAssets: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddInvestmentModal({
  initialAssets,
  onClose,
  onSuccess,
}: AddInvestmentModalProps) {
  // Asset selection state
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Form fields
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>("USD");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [platform, setPlatform] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [notes, setNotes] = useState("");

  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assets when search changes
  const fetchAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    const result = await getAssets({
      search: assetSearch.trim() || undefined,
    });
    if (result.success && result.assets) {
      setAssets(result.assets);
    }
    setIsLoadingAssets(false);
  }, [assetSearch]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (assetSearch.trim() || assets.length === 0) {
        fetchAssets();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [assetSearch, fetchAssets, assets.length]);

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
    if (selectedAsset) {
      return Math.pow(10, -selectedAsset.precision).toString();
    }
    return "0.000001";
  }, [selectedAsset]);

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetSearch(asset.symbol);
    setShowAssetDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedAsset) {
      setError("please select an asset");
      return;
    }

    const effectivePlatform = platform === "Other" ? customPlatform : platform;
    if (!effectivePlatform.trim()) {
      setError("please select or enter a platform");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createInvestment({
        assetId: selectedAsset.id,
        quantity,
        purchasePrice,
        purchaseCurrency,
        purchaseDate,
        platform: effectivePlatform.trim(),
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "failed to create investment");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create investment");
      setIsSubmitting(false);
    }
  };

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) {
      return assets;
    }
    const search = assetSearch.toLowerCase();
    return assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(search) ||
        a.name.toLowerCase().includes(search)
    );
  }, [assets, assetSearch]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[480px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add investment</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          {/* Asset Selection */}
          <div className="space-y-1">
            <label htmlFor="asset" className="block text-sm text-[#737373]">
              asset <span className="text-[#a3a3a3]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="asset"
                value={assetSearch}
                onChange={(e) => {
                  setAssetSearch(e.target.value);
                  setShowAssetDropdown(true);
                  if (selectedAsset && e.target.value !== selectedAsset.symbol) {
                    setSelectedAsset(null);
                  }
                }}
                onFocus={() => setShowAssetDropdown(true)}
                className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="search by symbol or name..."
                disabled={isSubmitting}
                autoComplete="off"
              />
              {selectedAsset && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#737373]">
                  {selectedAsset.name}
                </div>
              )}

              {/* Asset Dropdown */}
              {showAssetDropdown && !selectedAsset && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-[200px] overflow-y-auto shadow-lg">
                  {isLoadingAssets ? (
                    <div className="px-3 py-2 text-sm text-[#a3a3a3]">
                      loading...
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[#a3a3a3]">
                      no assets found
                    </div>
                  ) : (
                    filteredAssets.slice(0, 10).map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleAssetSelect(asset)}
                        className="w-full px-3 py-2 text-left hover:bg-[#f5f5f5] flex justify-between items-center"
                      >
                        <span className="text-sm text-[#171717]">
                          {asset.symbol}
                        </span>
                        <span className="text-xs text-[#737373]">
                          {asset.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedAsset && (
              <p className="text-xs text-[#a3a3a3]">
                {selectedAsset.type.toLowerCase()} • precision:{" "}
                {selectedAsset.precision} decimals
              </p>
            )}
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
                selectedAsset?.precision === 6 ? "0.000001" : "0.00"
              }
              disabled={isSubmitting}
            />
            {selectedAsset && (
              <p className="text-xs text-[#a3a3a3]">
                max {selectedAsset.precision} decimal places for{" "}
                {selectedAsset.type === "CRYPTO" ? "crypto" : "stocks/ETFs"}
              </p>
            )}
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
              {isSubmitting ? "adding..." : "add investment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
