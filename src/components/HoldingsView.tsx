"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Investment } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";
import DeleteInvestmentModal from "./DeleteInvestmentModal";

interface HoldingsViewProps {
  investments: Investment[];
  onRefresh: () => void;
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
}

export default function HoldingsView({
  investments,
  onRefresh,
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

    // Calculate weighted average price for each holding
    holdingsMap.forEach((holding) => {
      holding.weightedAvgPrice = holding.totalCost / holding.totalQuantity;
      // Sort lots by purchase date descending (newest first)
      holding.lots.sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      );
    });

    // Sort holdings by symbol
    return Array.from(holdingsMap.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );
  }, [filteredInvestments]);

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
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#737373]">your holdings</span>
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

                      {/* Aggregated Details */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                        <span>total qty: {holding.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <span>
                          avg price: {primaryCurrency} {holding.weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span>
                          total cost: {primaryCurrency} {holding.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
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
