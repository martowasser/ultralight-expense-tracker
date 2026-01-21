"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Investment, CachedPrice } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";
import DeleteInvestmentModal from "./DeleteInvestmentModal";

interface HoldingsViewProps {
  investments: Investment[];
  prices?: CachedPrice[];
  pricesLoading?: boolean;
  lastPriceUpdate?: Date | null;
  onRefresh: () => void;
  onRefreshPrices?: (forceRefresh?: boolean) => void;
  onAddInvestment?: () => void;
  onEditInvestment?: (investment: Investment) => void;
}

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
}

export default function HoldingsView({
  investments,
  prices = [],
  pricesLoading = false,
  lastPriceUpdate,
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
  const router = useRouter();

  const handleDeleteSuccess = () => {
    setDeleteInvestmentId(null);
    onRefresh();
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
      coingecko: "CoinGecko",
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
        });
      }
    });

    // Calculate weighted average price and price data for each holding
    holdingsMap.forEach((holding) => {
      holding.weightedAvgPrice = holding.totalCost / holding.totalQuantity;

      // Add price data if available
      const priceData = priceMap.get(holding.symbol);
      if (priceData) {
        holding.currentPrice = parseFloat(priceData.price);
        holding.change24h = priceData.change24h ? parseFloat(priceData.change24h) : null;
        holding.priceSource = priceData.source;
        holding.currentValue = holding.totalQuantity * holding.currentPrice;
        holding.gainLoss = holding.currentValue - holding.totalCost;
        holding.gainLossPercent = (holding.gainLoss / holding.totalCost) * 100;
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
  }, [filteredInvestments, priceMap]);

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
        <div className="border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
          {holdings.map((holding) => {
            const isExpanded = expandedHoldings.has(holding.symbol);
            const hasMultipleLots = holding.lots.length > 1;
            // Get the primary currency from the first lot (for display purposes)
            const primaryCurrency = holding.lots[0].purchaseCurrency;

            return (
              <div key={holding.symbol} className="bg-white">
                {/* Holding Summary Row */}
                <div
                  className={`p-4 hover:bg-[#fafafa] transition-colors ${hasMultipleLots ? "cursor-pointer" : ""}`}
                  onClick={() => hasMultipleLots && toggleExpand(holding.symbol)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Symbol, Name, and Lot Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#171717]">
                          {holding.symbol}
                        </span>
                        <span className="text-xs text-[#a3a3a3] px-1.5 py-0.5 bg-[#f5f5f5] rounded">
                          {holding.type.toLowerCase()}
                        </span>
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
                      {holding.currentPrice !== undefined && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="text-[#171717] font-medium">
                            ${formatPrice(holding.currentPrice)}
                          </span>
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
                            <span className="text-[#a3a3a3]">
                              via {formatSourceName(holding.priceSource)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Aggregated Details */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                        <span>qty: {holding.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <span>
                          avg: {primaryCurrency} {holding.weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span>
                          cost: {primaryCurrency} {holding.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {holding.currentValue !== undefined && (
                          <span>
                            value: ${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        {holding.gainLoss !== undefined && holding.gainLossPercent !== undefined && (
                          <span
                            className={
                              holding.gainLoss >= 0 ? "text-green-700" : "text-red-700"
                            }
                          >
                            {holding.gainLoss >= 0 ? "+" : ""}${holding.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({holding.gainLoss >= 0 ? "+" : ""}{holding.gainLossPercent.toFixed(2)}%)
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
      )}

      {/* Delete Confirmation Modal */}
      {deleteInvestmentId && (
        <DeleteInvestmentModal
          investmentId={deleteInvestmentId}
          onClose={() => setDeleteInvestmentId(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
