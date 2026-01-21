"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Investment, CachedPrice, Asset, HoldingDividendYield, CurrencyConversionRates } from "@/app/investments/actions";
import { AssetType, Currency } from "@/generated/prisma/enums";
import { CURRENCY_INFO } from "@/app/investments/constants";
import DeleteInvestmentModal from "./DeleteInvestmentModal";
import ManualPriceModal from "./ManualPriceModal";

type CurrencyDisplayMode = "original" | "display";

// Asset type icon colors (Tailwind needs full class names, not dynamic construction)
const assetTypeColors: Record<AssetType, string> = {
  CRYPTO: "text-[#f59e0b]",  // amber
  STOCK: "text-[#3b82f6]",   // blue
  ETF: "text-[#10b981]",     // green
};

// Asset type icons
const AssetTypeIcon = ({ type }: { type: AssetType }) => {
  switch (type) {
    case "CRYPTO":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2zm0-2h2V7h-2v7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "STOCK":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v8H3v-8zm4-5h2v13H7V8zm4-5h2v18h-2V3zm4 8h2v10h-2V11zm4-3h2v13h-2V8z" />
        </svg>
      );
    case "ETF":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
        </svg>
      );
    default:
      return null;
  }
};

interface HoldingsViewProps {
  investments: Investment[];
  prices?: CachedPrice[];
  dividendYields?: HoldingDividendYield[];
  pricesLoading?: boolean;
  lastPriceUpdate?: Date | null;
  displayCurrency?: Currency;
  exchangeRates?: CurrencyConversionRates;
  onRefresh: () => void;
  onRefreshPrices?: (forceRefresh?: boolean) => void;
  onAddInvestment?: () => void;
  onEditInvestment?: (investment: Investment) => void;
}

// Helper to check if an asset is a custom asset (not global)
const isCustomAsset = (investment: Investment): boolean => {
  return !investment.asset.isGlobal;
};

interface Holding {
  symbol: string;
  name: string;
  type: AssetType;
  assetId: string;
  totalQuantity: number;
  weightedAvgPrice: number;
  totalCost: number;
  lots: Investment[];
  // Price data
  currentPrice?: number;
  change24h?: number | null;
  priceSource?: string;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  // Custom asset tracking
  isCustom: boolean;
  // Dividend yield
  dividendYield?: number | null;
  // Currency tracking
  primaryCurrency: Currency;  // The most common purchase currency among lots
  hasMixedCurrencies: boolean;  // True if lots have different currencies
  // Converted values (for display currency mode)
  totalCostConverted?: number;  // Total cost converted to display currency
  currentValueConverted?: number;  // Current value converted to display currency
  gainLossConverted?: number;  // Gain/loss in display currency
  weightedAvgPriceConverted?: number;  // Avg price converted to display currency
}

export default function HoldingsView({
  investments,
  prices = [],
  dividendYields = [],
  pricesLoading = false,
  lastPriceUpdate,
  displayCurrency = "USD",
  exchangeRates = {},
  onRefresh,
  onRefreshPrices,
  onAddInvestment,
  onEditInvestment,
}: HoldingsViewProps) {
  const [deleteInvestmentId, setDeleteInvestmentId] = useState<string | null>(null);
  const [expandedHoldings, setExpandedHoldings] = useState<Set<string>>(new Set());
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [manualPriceAsset, setManualPriceAsset] = useState<{ asset: Asset; price?: CachedPrice } | null>(null);
  const [currencyMode, setCurrencyMode] = useState<CurrencyDisplayMode>("original");
  const router = useRouter();

  // Get currency symbol for display
  const getCurrencySymbol = (currency: Currency): string => {
    return CURRENCY_INFO[currency]?.symbol || currency;
  };

  // Helper function to convert amount from one currency to display currency
  const convertToDisplayCurrency = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === displayCurrency) {
      return amount;
    }
    const rateKey = `${fromCurrency}_${displayCurrency}`;
    const rate = exchangeRates[rateKey];
    if (rate === undefined) {
      // Fallback: return original amount if rate not available
      return amount;
    }
    return amount * rate;
  };

  const handleDeleteSuccess = () => {
    setDeleteInvestmentId(null);
    onRefresh();
    router.refresh();
  };

  const handleManualPriceSuccess = () => {
    setManualPriceAsset(null);
    onRefresh();
    if (onRefreshPrices) {
      onRefreshPrices(false);
    }
    router.refresh();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastUpdated = (date: Date | null | undefined) => {
    if (!date) return "never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(date);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    }
  };

  const formatSourceName = (source: string) => {
    // Check if it's a stale cache source (e.g., "binance (cached)")
    const isCached = source.includes("(cached)");
    const baseSource = source.replace(" (cached)", "");

    const sourceNames: Record<string, string> = {
      binance: "Binance",
      yahoo: "Yahoo Finance",
      coingecko: "CoinGecko (fallback)",
      alphavantage: "Alpha Vantage (fallback)",
      manual: "Manual",
    };

    const displayName = sourceNames[baseSource] || baseSource;
    return isCached ? `${displayName} (stale)` : displayName;
  };

  const toggleExpand = (symbol: string) => {
    setExpandedHoldings((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  // Create a map of prices by symbol for quick lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, CachedPrice>();
    prices.forEach((price) => {
      map.set(price.symbol, price);
    });
    return map;
  }, [prices]);

  // Create a map of dividend yields by symbol for quick lookup
  const yieldMap = useMemo(() => {
    const map = new Map<string, number | null>();
    dividendYields.forEach((y) => {
      map.set(y.symbol, y.yield);
    });
    return map;
  }, [dividendYields]);

  // Get unique platforms from user's investments
  const uniquePlatforms = useMemo(() => {
    const platforms = new Set(investments.map((inv) => inv.platform));
    return Array.from(platforms).sort();
  }, [investments]);

  // Filter investments first, then aggregate into holdings
  const filteredInvestments = useMemo(() => {
    return investments.filter((investment) => {
      // Symbol filter (case-insensitive)
      if (symbolFilter.trim()) {
        const search = symbolFilter.trim().toLowerCase();
        const matchesSymbol = investment.asset.symbol.toLowerCase().includes(search);
        const matchesName = investment.asset.name.toLowerCase().includes(search);
        if (!matchesSymbol && !matchesName) return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && investment.asset.type !== typeFilter) {
        return false;
      }

      // Platform filter
      if (platformFilter !== "ALL" && investment.platform !== platformFilter) {
        return false;
      }

      return true;
    });
  }, [investments, symbolFilter, typeFilter, platformFilter]);

  // Aggregate filtered investments into holdings by symbol
  const holdings = useMemo(() => {
    const holdingsMap = new Map<string, Holding>();

    filteredInvestments.forEach((investment) => {
      const symbol = investment.asset.symbol;
      const quantity = parseFloat(investment.quantity);
      const price = parseFloat(investment.purchasePrice);
      const cost = quantity * price;

      if (holdingsMap.has(symbol)) {
        const holding = holdingsMap.get(symbol)!;
        holding.totalQuantity += quantity;
        holding.totalCost += cost;
        holding.lots.push(investment);
      } else {
        holdingsMap.set(symbol, {
          symbol,
          name: investment.asset.name,
          type: investment.asset.type,
          assetId: investment.assetId,
          totalQuantity: quantity,
          totalCost: cost,
          weightedAvgPrice: 0, // Will be calculated below
          lots: [investment],
          isCustom: isCustomAsset(investment),
          primaryCurrency: investment.purchaseCurrency as Currency,
          hasMixedCurrencies: false,
        });
      }
    });

    // Calculate weighted average price and price data for each holding
    holdingsMap.forEach((holding) => {
      holding.weightedAvgPrice = holding.totalCost / holding.totalQuantity;

      // Check if lots have mixed currencies
      const currencies = new Set(holding.lots.map((lot) => lot.purchaseCurrency));
      holding.hasMixedCurrencies = currencies.size > 1;

      // Determine primary currency (most common among lots, or first if tied)
      if (holding.hasMixedCurrencies) {
        const currencyCount = new Map<string, number>();
        holding.lots.forEach((lot) => {
          const count = currencyCount.get(lot.purchaseCurrency) || 0;
          currencyCount.set(lot.purchaseCurrency, count + 1);
        });
        let maxCount = 0;
        currencyCount.forEach((count, currency) => {
          if (count > maxCount) {
            maxCount = count;
            holding.primaryCurrency = currency as Currency;
          }
        });
      }

      // Calculate converted cost basis (sum each lot's cost converted individually for accuracy)
      let totalCostConverted = 0;
      holding.lots.forEach((lot) => {
        const lotQuantity = parseFloat(lot.quantity);
        const lotPrice = parseFloat(lot.purchasePrice);
        const lotCost = lotQuantity * lotPrice;
        totalCostConverted += convertToDisplayCurrency(lotCost, lot.purchaseCurrency);
      });
      holding.totalCostConverted = totalCostConverted;
      holding.weightedAvgPriceConverted = totalCostConverted / holding.totalQuantity;

      // Add price data if available
      const priceData = priceMap.get(holding.symbol);
      if (priceData) {
        holding.currentPrice = parseFloat(priceData.price);
        holding.change24h = priceData.change24h ? parseFloat(priceData.change24h) : null;
        holding.priceSource = priceData.source;
        // Current value in USD (prices from API are in USD)
        holding.currentValue = holding.totalQuantity * holding.currentPrice;
        // Convert current value to display currency
        holding.currentValueConverted = convertToDisplayCurrency(holding.currentValue, "USD");
        // Gain/loss in original currencies (mixed currencies may be inaccurate)
        holding.gainLoss = holding.currentValue - holding.totalCost;
        holding.gainLossPercent = (holding.gainLoss / holding.totalCost) * 100;
        // Gain/loss in display currency (accurate after conversion)
        holding.gainLossConverted = holding.currentValueConverted - holding.totalCostConverted;
      }

      // Add dividend yield if available (only for holdings with dividends)
      if (yieldMap.has(holding.symbol)) {
        holding.dividendYield = yieldMap.get(holding.symbol) ?? null;
      }

      // Sort lots by purchase date descending (newest first)
      holding.lots.sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      );
    });

    // Sort holdings by symbol
    return Array.from(holdingsMap.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );
  }, [filteredInvestments, priceMap, yieldMap, displayCurrency, exchangeRates]);

  // Empty state for new users (no investments at all)
  if (investments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#737373]">your holdings</span>
        </div>
        <div className="border border-[#e5e5e5] bg-white p-8 text-center">
          <p className="text-sm text-[#737373] mb-4">
            you don&apos;t have any investments yet
          </p>
          <p className="text-xs text-[#a3a3a3] mb-6">
            start tracking your portfolio by adding your first investment
          </p>
          {onAddInvestment && (
            <button
              onClick={onAddInvestment}
              className="px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[44px]"
            >
              + add your first investment
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasActiveFilters = symbolFilter.trim() || typeFilter !== "ALL" || platformFilter !== "ALL";
  const totalLots = filteredInvestments.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#737373]">your holdings</span>
          {investments.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#a3a3a3]">
              <span>updated {formatLastUpdated(lastPriceUpdate)}</span>
              {onRefreshPrices && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onRefreshPrices(false)}
                    disabled={pricesLoading}
                    className={`px-2 py-1 border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] ${
                      pricesLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Refresh prices (use cache if fresh)"
                  >
                    {pricesLoading ? "..." : "refresh"}
                  </button>
                  <button
                    onClick={() => onRefreshPrices(true)}
                    disabled={pricesLoading}
                    className={`px-2 py-1 border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] ${
                      pricesLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Force refresh prices (clear cache)"
                  >
                    {pricesLoading ? "..." : "force"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-[#a3a3a3]">
          {holdings.length === 0
            ? "no matches"
            : `${holdings.length} holding${holdings.length === 1 ? "" : "s"} · ${totalLots} lot${totalLots === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-3">
        {/* Symbol Search */}
        <input
          type="text"
          placeholder="filter by symbol or name..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
        />

        {/* Type and Platform Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Type Filter */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                typeFilter === "ALL"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
            >
              all types
            </button>
            <button
              onClick={() => setTypeFilter("CRYPTO")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                typeFilter === "CRYPTO"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
            >
              crypto
            </button>
            <button
              onClick={() => setTypeFilter("STOCK")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                typeFilter === "STOCK"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
            >
              stocks
            </button>
            <button
              onClick={() => setTypeFilter("ETF")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                typeFilter === "ETF"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
            >
              etfs
            </button>
          </div>

          {/* Platform Filter */}
          {uniquePlatforms.length > 1 && (
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-2 py-1.5 text-xs text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none min-h-[32px]"
            >
              <option value="ALL">all platforms</option>
              {uniquePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          )}

          {/* Currency Display Mode Toggle */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setCurrencyMode("original")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                currencyMode === "original"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
              title="Show values in original purchase currency"
            >
              original
            </button>
            <button
              onClick={() => setCurrencyMode("display")}
              className={`px-2 py-1.5 text-xs min-h-[32px] border ${
                currencyMode === "display"
                  ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                  : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
              }`}
              title={`Show values in ${displayCurrency}`}
            >
              {getCurrencySymbol(displayCurrency)} {displayCurrency}
            </button>
          </div>
        </div>
      </div>

      {/* Holdings List or No Results */}
      {holdings.length === 0 ? (
        <div className="border border-[#e5e5e5] bg-white p-6 text-center">
          <p className="text-sm text-[#737373]">no holdings match your filters</p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSymbolFilter("");
                setTypeFilter("ALL");
                setPlatformFilter("ALL");
              }}
              className="mt-3 px-3 py-2 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
            >
              clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View - hidden on mobile */}
          <div className="hidden md:block border border-[#e5e5e5] bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafafa] border-b border-[#e5e5e5]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#737373]">Asset</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Quantity</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Avg Price</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Current Price</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Gain/Loss</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">24h</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Yield</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#737373]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {holdings.map((holding) => {
                  const isExpanded = expandedHoldings.has(holding.symbol);
                  const hasMultipleLots = holding.lots.length > 1;
                  // Determine which currency to show based on mode
                  const showCurrency = currencyMode === "display" ? displayCurrency : holding.primaryCurrency;
                  const showCurrencySymbol = getCurrencySymbol(showCurrency);

                  return (
                    <React.Fragment key={holding.symbol}>
                      {/* Main Holding Row */}
                      <tr
                        className={`hover:bg-[#fafafa] transition-colors ${hasMultipleLots ? "cursor-pointer" : ""}`}
                        onClick={() => hasMultipleLots && toggleExpand(holding.symbol)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={assetTypeColors[holding.type]}>
                              <AssetTypeIcon type={holding.type} />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#171717]">{holding.symbol}</span>
                                {holding.isCustom && (
                                  <span className="text-xs text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded">
                                    custom
                                  </span>
                                )}
                                {holding.hasMixedCurrencies && (
                                  <span className="text-xs text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded" title="Lots have different purchase currencies">
                                    mixed
                                  </span>
                                )}
                                {hasMultipleLots && (
                                  <span className="text-xs text-[#fafafa] px-1.5 py-0.5 bg-[#737373] rounded">
                                    {holding.lots.length} lots
                                  </span>
                                )}
                                {hasMultipleLots && (
                                  <svg
                                    className={`w-3 h-3 text-[#737373] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs text-[#737373]">{holding.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-[#171717]">
                          {holding.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>
                        <td className="px-4 py-3 text-right text-[#737373]">
                          <div>
                            {showCurrencySymbol}{(currencyMode === "display" ? (holding.weightedAvgPriceConverted ?? holding.weightedAvgPrice) : holding.weightedAvgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {holding.hasMixedCurrencies && currencyMode === "original" && (
                              <span className="block text-xs text-amber-600">mixed currencies</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {holding.currentPrice !== undefined ? (
                            <div>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[#171717]">
                                  {currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}{formatPrice(currencyMode === "display" ? convertToDisplayCurrency(holding.currentPrice, "USD") : holding.currentPrice)}
                                </span>
                                {holding.isCustom && holding.priceSource === "manual" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const priceData = priceMap.get(holding.symbol);
                                      setManualPriceAsset({
                                        asset: holding.lots[0].asset,
                                        price: priceData,
                                      });
                                    }}
                                    className="p-0.5 text-[#a3a3a3] hover:text-[#171717]"
                                    title="Update price"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {holding.priceSource && (
                                <span className={`block text-xs ${holding.priceSource === "manual" ? "text-blue-600" : "text-[#a3a3a3]"}`}>
                                  {holding.priceSource === "manual" ? "manual price" : `via ${formatSourceName(holding.priceSource)}`}
                                </span>
                              )}
                            </div>
                          ) : holding.isCustom ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualPriceAsset({
                                  asset: holding.lots[0].asset,
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              set price
                            </button>
                          ) : (
                            <span className="text-[#a3a3a3]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#171717] font-medium">
                          {holding.currentValue !== undefined
                            ? `${currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}${(currencyMode === "display" ? (holding.currentValueConverted ?? holding.currentValue) : holding.currentValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {holding.gainLoss !== undefined && holding.gainLossPercent !== undefined ? (() => {
                            const displayGainLoss = currencyMode === "display" ? (holding.gainLossConverted ?? holding.gainLoss) : holding.gainLoss;
                            const displayCostBasis = currencyMode === "display" ? (holding.totalCostConverted ?? holding.totalCost) : holding.totalCost;
                            const displayGainLossPercent = displayCostBasis > 0 ? (displayGainLoss / displayCostBasis) * 100 : 0;
                            return (
                              <div className={displayGainLoss >= 0 ? "text-green-700" : "text-red-700"}>
                                <span>{displayGainLoss >= 0 ? "+" : ""}{currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}{Math.abs(displayGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="block text-xs">
                                  ({displayGainLoss >= 0 ? "+" : ""}{displayGainLossPercent.toFixed(2)}%)
                                </span>
                              </div>
                            );
                          })() : (
                            <span className="text-[#a3a3a3]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {holding.change24h !== null && holding.change24h !== undefined ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                                holding.change24h >= 0
                                  ? "text-green-700 bg-green-50"
                                  : "text-red-700 bg-red-50"
                              }`}
                            >
                              {holding.change24h >= 0 ? "+" : ""}
                              {holding.change24h.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[#a3a3a3]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {holding.dividendYield !== undefined && holding.dividendYield !== null ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-xs text-purple-700 bg-purple-50">
                              {holding.dividendYield.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[#a3a3a3]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!hasMultipleLots && (
                            <div className="flex justify-end gap-1">
                              {onEditInvestment && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditInvestment(holding.lots[0]);
                                  }}
                                  className="px-2 py-1 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
                                >
                                  edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteInvestmentId(holding.lots[0].id);
                                }}
                                className="px-2 py-1 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
                              >
                                delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Lots Rows */}
                      {isExpanded && hasMultipleLots && holding.lots.map((lot) => {
                        const lotCost = parseFloat(lot.quantity) * parseFloat(lot.purchasePrice);
                        return (
                          <tr key={lot.id} className="bg-[#fafafa] hover:bg-[#f5f5f5] transition-colors">
                            <td className="px-4 py-2 pl-12">
                              <div className="text-xs text-[#a3a3a3]">
                                <span className="font-medium text-[#737373]">{lot.platform}</span>
                                <span className="mx-2">·</span>
                                {formatDate(lot.purchaseDate)}
                                {lot.notes && <span className="ml-2 italic">"{lot.notes}"</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-[#737373]">
                              {lot.quantity}
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-[#a3a3a3]">
                              {lot.purchaseCurrency} {lot.purchasePrice}
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-[#a3a3a3]">—</td>
                            <td className="px-4 py-2 text-right text-xs text-[#737373]">
                              {lot.purchaseCurrency} {lotCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-[#a3a3a3]">—</td>
                            <td className="px-4 py-2 text-right text-xs text-[#a3a3a3]">—</td>
                            <td className="px-4 py-2 text-right text-xs text-[#a3a3a3]">—</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                {onEditInvestment && (
                                  <button
                                    type="button"
                                    onClick={() => onEditInvestment(lot)}
                                    className="px-2 py-1 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
                                  >
                                    edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDeleteInvestmentId(lot.id)}
                                  className="px-2 py-1 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717]"
                                >
                                  delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - hidden on desktop */}
          <div className="md:hidden border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
            {holdings.map((holding) => {
              const isExpanded = expandedHoldings.has(holding.symbol);
              const hasMultipleLots = holding.lots.length > 1;
              // Determine which currency to show based on mode
              const showCurrency = currencyMode === "display" ? displayCurrency : holding.primaryCurrency;
              const showCurrencySymbol = getCurrencySymbol(showCurrency);

              return (
                <div key={holding.symbol} className="bg-white">
                  {/* Holding Summary Card */}
                  <div
                    className={`p-4 hover:bg-[#fafafa] transition-colors ${hasMultipleLots ? "cursor-pointer" : ""}`}
                    onClick={() => hasMultipleLots && toggleExpand(holding.symbol)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Symbol, Name, Type Icon, and Lot Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={assetTypeColors[holding.type]}>
                            <AssetTypeIcon type={holding.type} />
                          </span>
                          <span className="text-sm font-medium text-[#171717]">
                            {holding.symbol}
                          </span>
                          <span className="text-xs text-[#a3a3a3] px-1.5 py-0.5 bg-[#f5f5f5] rounded">
                            {holding.type.toLowerCase()}
                          </span>
                          {holding.isCustom && (
                            <span className="text-xs text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded">
                              custom
                            </span>
                          )}
                          {holding.hasMixedCurrencies && (
                            <span className="text-xs text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded" title="Lots have different purchase currencies">
                              mixed
                            </span>
                          )}
                          {hasMultipleLots && (
                            <span className="text-xs text-[#fafafa] px-1.5 py-0.5 bg-[#737373] rounded">
                              {holding.lots.length} lots
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#737373] mt-0.5 truncate">
                          {holding.name}
                        </p>

                        {/* Price and Market Data */}
                        {holding.currentPrice !== undefined ? (
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-[#171717] font-medium">
                                {currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}{formatPrice(currencyMode === "display" ? convertToDisplayCurrency(holding.currentPrice, "USD") : holding.currentPrice)}
                              </span>
                              {holding.isCustom && holding.priceSource === "manual" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const priceData = priceMap.get(holding.symbol);
                                    setManualPriceAsset({
                                      asset: holding.lots[0].asset,
                                      price: priceData,
                                    });
                                  }}
                                  className="p-0.5 text-[#a3a3a3] hover:text-[#171717]"
                                  title="Update price"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {holding.change24h !== null && holding.change24h !== undefined && (
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  holding.change24h >= 0
                                    ? "text-green-700 bg-green-50"
                                    : "text-red-700 bg-red-50"
                                }`}
                              >
                                {holding.change24h >= 0 ? "+" : ""}
                                {holding.change24h.toFixed(2)}%
                              </span>
                            )}
                            {holding.priceSource && (
                              <span className={holding.priceSource === "manual" ? "text-blue-600" : "text-[#a3a3a3]"}>
                                {holding.priceSource === "manual" ? "manual price" : `via ${formatSourceName(holding.priceSource)}`}
                              </span>
                            )}
                          </div>
                        ) : holding.isCustom ? (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualPriceAsset({
                                  asset: holding.lots[0].asset,
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              set price
                            </button>
                          </div>
                        ) : null}

                        {/* Aggregated Details */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                          <span>qty: {holding.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                          <span>
                            avg: {showCurrencySymbol}{(currencyMode === "display" ? (holding.weightedAvgPriceConverted ?? holding.weightedAvgPrice) : holding.weightedAvgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span>
                            cost: {showCurrencySymbol}{(currencyMode === "display" ? (holding.totalCostConverted ?? holding.totalCost) : holding.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {holding.hasMixedCurrencies && currencyMode === "original" && <span className="text-amber-600"> (mixed)</span>}
                          </span>
                          {holding.currentValue !== undefined && (
                            <span>
                              value: {currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}{(currencyMode === "display" ? (holding.currentValueConverted ?? holding.currentValue) : holding.currentValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {holding.gainLoss !== undefined && holding.gainLossPercent !== undefined && (() => {
                            const displayGainLoss = currencyMode === "display" ? (holding.gainLossConverted ?? holding.gainLoss) : holding.gainLoss;
                            const displayCostBasis = currencyMode === "display" ? (holding.totalCostConverted ?? holding.totalCost) : holding.totalCost;
                            const displayGainLossPercent = displayCostBasis > 0 ? (displayGainLoss / displayCostBasis) * 100 : 0;
                            return (
                              <span
                                className={
                                  displayGainLoss >= 0 ? "text-green-700" : "text-red-700"
                                }
                              >
                                {displayGainLoss >= 0 ? "+" : ""}{currencyMode === "display" ? getCurrencySymbol(displayCurrency) : "$"}{Math.abs(displayGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({displayGainLoss >= 0 ? "+" : ""}{displayGainLossPercent.toFixed(2)}%)
                              </span>
                            );
                          })()}
                          {holding.dividendYield !== undefined && holding.dividendYield !== null && (
                            <span className="text-purple-700">
                              yield: {holding.dividendYield.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand/Collapse Icon for multiple lots */}
                      {hasMultipleLots && (
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 text-[#737373]">
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}

                      {/* Actions for single lot */}
                      {!hasMultipleLots && (
                        <div className="shrink-0 flex gap-2">
                          {onEditInvestment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditInvestment(holding.lots[0]);
                              }}
                              className="px-3 py-2 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[36px]"
                            >
                              edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteInvestmentId(holding.lots[0].id);
                            }}
                            className="px-3 py-2 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[36px]"
                          >
                            delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Lots View */}
                  {isExpanded && hasMultipleLots && (
                    <div className="bg-[#fafafa] border-t border-[#e5e5e5]">
                      <div className="px-4 py-2 text-xs text-[#a3a3a3] border-b border-[#e5e5e5]">
                        individual lots
                      </div>
                      <div className="divide-y divide-[#e5e5e5]">
                        {holding.lots.map((lot) => {
                          const lotCost = parseFloat(lot.quantity) * parseFloat(lot.purchasePrice);

                          return (
                            <div
                              key={lot.id}
                              className="px-4 py-3 hover:bg-[#f5f5f5] transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {/* Lot Details */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                                    <span>qty: {lot.quantity}</span>
                                    <span>
                                      @ {lot.purchaseCurrency} {lot.purchasePrice}
                                    </span>
                                    <span>= {lot.purchaseCurrency} {lotCost.toFixed(2)}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a3a3a3]">
                                    <span>{lot.platform}</span>
                                    <span>{formatDate(lot.purchaseDate)}</span>
                                  </div>
                                  {lot.notes && (
                                    <p className="mt-1 text-xs text-[#a3a3a3] italic truncate">
                                      {lot.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Lot Actions */}
                                <div className="shrink-0 flex gap-2">
                                  {onEditInvestment && (
                                    <button
                                      type="button"
                                      onClick={() => onEditInvestment(lot)}
                                      className="px-2 py-1.5 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[32px]"
                                    >
                                      edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDeleteInvestmentId(lot.id)}
                                    className="px-2 py-1.5 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[32px]"
                                  >
                                    delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteInvestmentId && (
        <DeleteInvestmentModal
          investmentId={deleteInvestmentId}
          onClose={() => setDeleteInvestmentId(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Manual Price Modal for Custom Assets */}
      {manualPriceAsset && (
        <ManualPriceModal
          asset={manualPriceAsset.asset}
          currentPrice={manualPriceAsset.price}
          onClose={() => setManualPriceAsset(null)}
          onSuccess={handleManualPriceSuccess}
        />
      )}
    </div>
  );
}
