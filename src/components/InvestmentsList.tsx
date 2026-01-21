"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Investment } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";
import DeleteInvestmentModal from "./DeleteInvestmentModal";

interface InvestmentsListProps {
  investments: Investment[];
  onRefresh: () => void;
  onAddInvestment?: () => void;
}

export default function InvestmentsList({
  investments,
  onRefresh,
  onAddInvestment,
}: InvestmentsListProps) {
  const [deleteInvestmentId, setDeleteInvestmentId] = useState<string | null>(null);
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

  // Get unique platforms from user's investments
  const uniquePlatforms = useMemo(() => {
    const platforms = new Set(investments.map((inv) => inv.platform));
    return Array.from(platforms).sort();
  }, [investments]);

  // Filter investments based on search and filters
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

  // Empty state for new users (no investments at all)
  if (investments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#737373]">your investments</span>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#737373]">your investments</span>
        <span className="text-xs text-[#a3a3a3]">
          {filteredInvestments.length === investments.length
            ? `${investments.length} lot${investments.length === 1 ? "" : "s"}`
            : `${filteredInvestments.length} of ${investments.length} lots`}
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

      {/* Investment List or No Results */}
      {filteredInvestments.length === 0 ? (
        <div className="border border-[#e5e5e5] bg-white p-6 text-center">
          <p className="text-sm text-[#737373]">no investments match your filters</p>
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
          {filteredInvestments.map((investment) => {
          const totalCost = (
            parseFloat(investment.quantity) * parseFloat(investment.purchasePrice)
          ).toFixed(2);

          return (
            <div
              key={investment.id}
              className="p-4 bg-white hover:bg-[#fafafa] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Symbol and Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#171717]">
                      {investment.asset.symbol}
                    </span>
                    <span className="text-xs text-[#a3a3a3] px-1.5 py-0.5 bg-[#f5f5f5] rounded">
                      {investment.asset.type.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5 truncate">
                    {investment.asset.name}
                  </p>

                  {/* Details */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                    <span>qty: {investment.quantity}</span>
                    <span>
                      @ {investment.purchaseCurrency} {investment.purchasePrice}
                    </span>
                    <span>= {investment.purchaseCurrency} {totalCost}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a3a3a3]">
                    <span>{investment.platform}</span>
                    <span>{formatDate(investment.purchaseDate)}</span>
                  </div>
                  {investment.notes && (
                    <p className="mt-1 text-xs text-[#a3a3a3] italic truncate">
                      {investment.notes}
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setDeleteInvestmentId(investment.id)}
                  className="shrink-0 px-3 py-2 text-xs text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[36px]"
                >
                  delete
                </button>
              </div>
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
