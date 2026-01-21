"use client";

import { useState, useEffect, useMemo } from "react";
import { Investment, Dividend, getDividends } from "@/app/investments/actions";
import { DIVIDEND_TYPES } from "@/app/investments/constants";
import { DividendType } from "@/generated/prisma/enums";
import RecordDividendModal from "./RecordDividendModal";

interface DividendsTabProps {
  investments: Investment[];
  onRefresh: () => void;
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

export default function DividendsTab({ investments, onRefresh }: DividendsTabProps) {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<DividendType | "">("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Check if user has any investments to record dividends against
  const hasInvestments = investments.length > 0;

  // Get unique symbols from investments for filter dropdown
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    investments.forEach((inv) => {
      symbols.add(inv.asset.symbol);
    });
    return Array.from(symbols).sort();
  }, [investments]);

  // Fetch dividends when filters change
  useEffect(() => {
    async function fetchDividends() {
      setIsLoading(true);
      const result = await getDividends({
        symbol: symbolFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        type: typeFilter || undefined,
      });

      if (result.success && result.dividends) {
        setDividends(result.dividends);
      } else {
        setDividends([]);
      }
      setIsLoading(false);
    }

    fetchDividends();
  }, [symbolFilter, typeFilter, startDateFilter, endDateFilter]);

  const handleRecordSuccess = () => {
    setShowRecordModal(false);
    // Refetch dividends
    getDividends({
      symbol: symbolFilter || undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      type: typeFilter || undefined,
    }).then((result) => {
      if (result.success && result.dividends) {
        setDividends(result.dividends);
      }
    });
    onRefresh();
  };

  const clearFilters = () => {
    setSymbolFilter("");
    setTypeFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const hasActiveFilters = symbolFilter || typeFilter || startDateFilter || endDateFilter;

  return (
    <div className="space-y-6">
      {/* Header with Record Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[#171717]">dividend income</h2>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            track dividend payments from your investments
          </p>
        </div>
        <button
          onClick={() => setShowRecordModal(true)}
          disabled={!hasInvestments}
          className={`px-4 py-2 text-sm min-h-[40px] ${
            hasInvestments
              ? "text-[#fafafa] bg-[#171717] hover:bg-[#404040]"
              : "text-[#a3a3a3] bg-[#e5e5e5] cursor-not-allowed"
          }`}
          title={!hasInvestments ? "Add investments first to record dividends" : undefined}
        >
          + record dividend
        </button>
      </div>

      {/* Filter Controls */}
      {hasInvestments && (
        <div className="p-4 bg-[#fafafa] border border-[#e5e5e5] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">
              filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#171717] hover:underline"
              >
                clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Symbol Filter */}
            <div>
              <label className="block text-xs text-[#737373] mb-1">symbol</label>
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#e5e5e5] bg-white focus:outline-none focus:border-[#171717]"
              >
                <option value="">all symbols</option>
                {uniqueSymbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs text-[#737373] mb-1">type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DividendType | "")}
                className="w-full px-3 py-2 text-sm border border-[#e5e5e5] bg-white focus:outline-none focus:border-[#171717]"
              >
                <option value="">all types</option>
                {DIVIDEND_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-xs text-[#737373] mb-1">from date</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#e5e5e5] bg-white focus:outline-none focus:border-[#171717]"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-xs text-[#737373] mb-1">to date</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#e5e5e5] bg-white focus:outline-none focus:border-[#171717]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!hasInvestments ? (
        // No investments empty state
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg
              className="w-6 h-6 text-[#a3a3a3]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-[#737373] mb-1">no investments yet</p>
          <p className="text-xs text-[#a3a3a3]">
            add investments first to start tracking dividends
          </p>
        </div>
      ) : isLoading ? (
        // Loading state
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg
              className="w-6 h-6 text-[#a3a3a3] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-sm text-[#737373]">loading dividends...</p>
        </div>
      ) : dividends.length === 0 ? (
        // No dividends empty state
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg
              className="w-6 h-6 text-[#a3a3a3]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-[#737373] mb-1">
            {hasActiveFilters ? "no dividends match your filters" : "no dividends recorded"}
          </p>
          <p className="text-xs text-[#a3a3a3] mb-4">
            {hasActiveFilters
              ? "try adjusting your filter criteria"
              : "record your first dividend payment to start tracking income"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-[#171717] border border-[#e5e5e5] hover:border-[#a3a3a3]"
            >
              clear filters
            </button>
          ) : (
            <button
              onClick={() => setShowRecordModal(true)}
              className="px-4 py-2 text-sm text-[#171717] border border-[#e5e5e5] hover:border-[#a3a3a3]"
            >
              + record dividend
            </button>
          )}
        </div>
      ) : (
        // Dividend list
        <div className="space-y-2">
          <div className="text-xs text-[#a3a3a3] px-1">
            showing {dividends.length} dividend{dividends.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="text-left py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Reinvested
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-[#737373] text-xs uppercase tracking-wide">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((dividend) => (
                  <tr
                    key={dividend.id}
                    className="border-b border-[#f5f5f5] hover:bg-[#fafafa]"
                  >
                    <td className="py-3 px-2 text-[#171717]">
                      {formatDate(dividend.paymentDate)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-[#171717]">
                        {dividend.investment.asset.symbol}
                      </span>
                      <span className="text-xs text-[#a3a3a3] ml-1">
                        {dividend.investment.asset.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-[#22c55e]">
                      {formatAmount(dividend.amount, dividend.currency)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-[#f5f5f5] text-[#737373]">
                        {formatDividendType(dividend.type)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {dividend.isReinvested ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-[#22c55e]">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-[#a3a3a3]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-[#737373] text-xs max-w-[150px] truncate">
                      {dividend.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {dividends.map((dividend) => (
              <div
                key={dividend.id}
                className="p-4 border border-[#e5e5e5] bg-white"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-[#171717]">
                      {dividend.investment.asset.symbol}
                    </span>
                    <span className="text-xs text-[#a3a3a3] ml-1">
                      {dividend.investment.asset.name}
                    </span>
                  </div>
                  <span className="font-medium text-[#22c55e]">
                    {formatAmount(dividend.amount, dividend.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                  <span>{formatDate(dividend.paymentDate)}</span>
                  <span className="text-[#e5e5e5]">|</span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-[#f5f5f5]">
                    {formatDividendType(dividend.type)}
                  </span>
                  {dividend.isReinvested && (
                    <>
                      <span className="text-[#e5e5e5]">|</span>
                      <span className="text-[#22c55e]">reinvested</span>
                    </>
                  )}
                </div>
                {dividend.notes && (
                  <p className="mt-2 text-xs text-[#a3a3a3]">{dividend.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Dividend Modal */}
      {showRecordModal && (
        <RecordDividendModal
          investments={investments}
          onClose={() => setShowRecordModal(false)}
          onSuccess={handleRecordSuccess}
        />
      )}
    </div>
  );
}
