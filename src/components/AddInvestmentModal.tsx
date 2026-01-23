"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Asset,
  CatalogAsset,
  searchCatalogAssets,
  createInvestmentFromCatalog,
  createInvestment,
  validateAndAddStock,
} from "@/app/investments/actions";
import { PLATFORMS, CURRENCIES } from "@/app/investments/constants";
import { Currency, AssetType } from "@/generated/prisma/enums";

interface AddInvestmentModalProps {
  initialAssets: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

type AssetTab = "CRYPTO" | "STOCK" | "ETF" | "CUSTOM";

export default function AddInvestmentModal({
  initialAssets,
  onClose,
  onSuccess,
}: AddInvestmentModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<AssetTab>("CRYPTO");

  // Catalog asset selection state
  const [catalogAssets, setCatalogAssets] = useState<CatalogAsset[]>([]);
  const [selectedCatalogAsset, setSelectedCatalogAsset] = useState<CatalogAsset | null>(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Custom asset selection state
  const [customAssets] = useState<Asset[]>(
    initialAssets.filter((a) => !a.catalogRef && !a.isGlobal)
  );
  const [selectedCustomAsset, setSelectedCustomAsset] = useState<Asset | null>(null);

  // Symbol validation state
  const [isValidatingSymbol, setIsValidatingSymbol] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  // Get the selected asset (either catalog or custom)
  const selectedAsset = activeTab === "CUSTOM" ? selectedCustomAsset : selectedCatalogAsset;

  // Fetch catalog assets when search or tab changes
  const fetchCatalogAssets = useCallback(async () => {
    if (activeTab === "CUSTOM") return;

    setIsLoadingAssets(true);
    setValidationError(null);

    const result = await searchCatalogAssets({
      search: assetSearch.trim() || undefined,
      type: activeTab as AssetType,
      limit: 50,
    });

    if (result.success && result.assets) {
      setCatalogAssets(result.assets);
    }

    setIsLoadingAssets(false);
  }, [assetSearch, activeTab]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCatalogAssets();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchCatalogAssets]);

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
    const precision = selectedAsset
      ? "precision" in selectedAsset
        ? selectedAsset.precision
        : 6
      : 6;
    return Math.pow(10, -precision).toString();
  }, [selectedAsset]);

  // Handle tab change
  const handleTabChange = (tab: AssetTab) => {
    setActiveTab(tab);
    setSelectedCatalogAsset(null);
    setSelectedCustomAsset(null);
    setAssetSearch("");
    setValidationError(null);
  };

  // Handle catalog asset selection
  const handleCatalogAssetSelect = (asset: CatalogAsset) => {
    setSelectedCatalogAsset(asset);
    setAssetSearch(asset.symbol);
    setShowAssetDropdown(false);
    setValidationError(null);
  };

  // Handle custom asset selection
  const handleCustomAssetSelect = (asset: Asset) => {
    setSelectedCustomAsset(asset);
    setShowAssetDropdown(false);
  };

  // Handle symbol validation for stocks not in catalog
  const handleValidateSymbol = async () => {
    if (!assetSearch.trim()) return;

    setIsValidatingSymbol(true);
    setValidationError(null);

    const result = await validateAndAddStock(assetSearch.trim());

    if (result.success && result.asset) {
      setSelectedCatalogAsset(result.asset);
      setCatalogAssets([result.asset, ...catalogAssets]);
      setShowAssetDropdown(false);
    } else {
      setValidationError(result.error || "Symbol not found");
    }

    setIsValidatingSymbol(false);
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
      let result;

      if (activeTab === "CUSTOM" && selectedCustomAsset) {
        // Create from existing asset
        result = await createInvestment({
          assetId: selectedCustomAsset.id,
          quantity,
          purchasePrice,
          purchaseCurrency,
          purchaseDate,
          platform: effectivePlatform.trim(),
          notes: notes.trim() || undefined,
        });
      } else if (selectedCatalogAsset) {
        // Create from catalog
        result = await createInvestmentFromCatalog({
          catalogSymbol: selectedCatalogAsset.symbol,
          quantity,
          purchasePrice,
          purchaseCurrency,
          purchaseDate,
          platform: effectivePlatform.trim(),
          notes: notes.trim() || undefined,
        });
      } else {
        setError("please select an asset");
        setIsSubmitting(false);
        return;
      }

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

  // Filter catalog assets based on search
  const filteredCatalogAssets = useMemo(() => {
    if (!assetSearch.trim()) {
      return catalogAssets;
    }
    const search = assetSearch.toLowerCase();
    return catalogAssets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(search) ||
        a.name.toLowerCase().includes(search)
    );
  }, [catalogAssets, assetSearch]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[520px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add investment</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-sm text-[#737373]">{error}</p>}

          {/* Asset Type Tabs */}
          <div className="space-y-3">
            <label className="block text-sm text-[#737373]">
              asset type
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleTabChange("CRYPTO")}
                disabled={isSubmitting}
                className={`flex-1 px-3 py-2 text-sm min-h-[44px] border ${
                  activeTab === "CRYPTO"
                    ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                    : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                } disabled:opacity-50`}
              >
                crypto
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("STOCK")}
                disabled={isSubmitting}
                className={`flex-1 px-3 py-2 text-sm min-h-[44px] border ${
                  activeTab === "STOCK"
                    ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                    : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                } disabled:opacity-50`}
              >
                stocks
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("ETF")}
                disabled={isSubmitting}
                className={`flex-1 px-3 py-2 text-sm min-h-[44px] border ${
                  activeTab === "ETF"
                    ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                    : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                } disabled:opacity-50`}
              >
                etfs
              </button>
              {customAssets.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange("CUSTOM")}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-2 text-sm min-h-[44px] border ${
                    activeTab === "CUSTOM"
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  } disabled:opacity-50`}
                >
                  custom
                </button>
              )}
            </div>
          </div>

          {/* Asset Selection */}
          <div className="space-y-1">
            <label htmlFor="asset" className="block text-sm text-[#737373]">
              asset <span className="text-[#a3a3a3]">*</span>
            </label>

            {activeTab === "CUSTOM" ? (
              /* Custom Asset Dropdown */
              <div className="relative">
                <select
                  id="asset"
                  value={selectedCustomAsset?.id || ""}
                  onChange={(e) => {
                    const asset = customAssets.find((a) => a.id === e.target.value);
                    setSelectedCustomAsset(asset || null);
                  }}
                  className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                  disabled={isSubmitting}
                >
                  <option value="">select custom asset</option>
                  {customAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.symbol} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Catalog Asset Search */
              <div className="relative">
                <input
                  type="text"
                  id="asset"
                  value={assetSearch}
                  onChange={(e) => {
                    setAssetSearch(e.target.value);
                    setShowAssetDropdown(true);
                    if (selectedCatalogAsset && e.target.value !== selectedCatalogAsset.symbol) {
                      setSelectedCatalogAsset(null);
                    }
                  }}
                  onFocus={() => setShowAssetDropdown(true)}
                  className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                  placeholder={`search ${activeTab.toLowerCase()} by symbol or name...`}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {selectedCatalogAsset && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#737373] max-w-[200px] truncate">
                    {selectedCatalogAsset.name}
                  </div>
                )}

                {/* Asset Dropdown */}
                {showAssetDropdown && !selectedCatalogAsset && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-[250px] overflow-y-auto shadow-lg">
                    {isLoadingAssets ? (
                      <div className="px-3 py-2 text-sm text-[#a3a3a3]">
                        loading...
                      </div>
                    ) : filteredCatalogAssets.length === 0 ? (
                      <div className="p-3">
                        <p className="text-sm text-[#a3a3a3] mb-2">
                          no assets found
                        </p>
                        {activeTab !== "CRYPTO" && assetSearch.trim() && (
                          <button
                            type="button"
                            onClick={handleValidateSymbol}
                            disabled={isValidatingSymbol}
                            className="text-sm text-[#171717] underline hover:no-underline"
                          >
                            {isValidatingSymbol ? "validating..." : `validate "${assetSearch.toUpperCase()}"`}
                          </button>
                        )}
                        {validationError && (
                          <p className="text-xs text-red-500 mt-1">{validationError}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        {filteredCatalogAssets.slice(0, 15).map((asset) => (
                          <button
                            key={asset.symbol}
                            type="button"
                            onClick={() => handleCatalogAssetSelect(asset)}
                            className="w-full px-3 py-2 text-left hover:bg-[#f5f5f5] flex justify-between items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#171717]">
                                {asset.symbol}
                              </span>
                              <span className="text-xs text-[#a3a3a3] px-1.5 py-0.5 bg-[#f5f5f5]">
                                {asset.source}
                              </span>
                            </div>
                            <span className="text-xs text-[#737373] truncate max-w-[180px]">
                              {asset.name}
                            </span>
                          </button>
                        ))}
                        {filteredCatalogAssets.length > 15 && (
                          <div className="px-3 py-2 text-xs text-[#a3a3a3] border-t border-[#e5e5e5]">
                            {filteredCatalogAssets.length - 15} more results...
                          </div>
                        )}
                        {activeTab !== "CRYPTO" && assetSearch.trim() && (
                          <div className="px-3 py-2 border-t border-[#e5e5e5]">
                            <button
                              type="button"
                              onClick={handleValidateSymbol}
                              disabled={isValidatingSymbol}
                              className="text-xs text-[#737373] hover:text-[#171717]"
                            >
                              {isValidatingSymbol
                                ? "validating..."
                                : `can't find your asset? validate "${assetSearch.toUpperCase()}"`}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedAsset && (
              <p className="text-xs text-[#a3a3a3]">
                {activeTab === "CUSTOM"
                  ? `${selectedCustomAsset?.type.toLowerCase()} • precision: ${selectedCustomAsset?.precision} decimals`
                  : `${selectedCatalogAsset?.type.toLowerCase()} • precision: ${selectedCatalogAsset?.precision} decimals`}
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
                selectedAsset
                  ? ("precision" in selectedAsset ? selectedAsset.precision : 6) === 6
                    ? "0.000001"
                    : "0.00"
                  : "0.00"
              }
              disabled={isSubmitting}
            />
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
