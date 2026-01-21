"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AssetLibraryList from "./AssetLibraryList";
import AddInvestmentModal from "./AddInvestmentModal";
import EditInvestmentModal from "./EditInvestmentModal";
import HoldingsView from "./HoldingsView";
import PortfolioDashboard from "./PortfolioDashboard";
import { Asset, Investment, CachedPrice, getAssets, getInvestments, GetAssetsInput, fetchAssetPrices, clearPriceCache } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

type TabType = "holdings" | "history" | "dividends";

interface AssetLibrarySectionProps {
  initialAssets: Asset[];
  initialInvestments: Investment[];
}

interface RefreshFeedback {
  type: "success" | "error";
  message: string;
}

export default function AssetLibrarySection({
  initialAssets,
  initialInvestments,
}: AssetLibrarySectionProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [prices, setPrices] = useState<CachedPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [refreshFeedback, setRefreshFeedback] = useState<RefreshFeedback | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("holdings");
  const router = useRouter();

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    const input: GetAssetsInput = {};

    if (search.trim()) {
      input.search = search.trim();
    }

    if (typeFilter !== "ALL") {
      input.type = typeFilter;
    }

    const result = await getAssets(input);

    if (result.success && result.assets) {
      setAssets(result.assets);
    }

    setIsLoading(false);
  }, [search, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAssets();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchAssets]);

  const fetchInvestments = useCallback(async () => {
    const result = await getInvestments();
    if (result.success && result.investments) {
      setInvestments(result.investments);
    }
  }, []);

  const fetchPricesData = useCallback(async (forceRefresh: boolean = false, showFeedback: boolean = false) => {
    setPricesLoading(true);
    setRefreshFeedback(null);

    try {
      // If force refresh, clear the cache first
      if (forceRefresh) {
        await clearPriceCache();
      }

      const result = await fetchAssetPrices(forceRefresh);
      if (result.success && result.prices) {
        setPrices(result.prices);
        // Find the most recent fetchedAt timestamp
        if (result.prices.length > 0) {
          const mostRecent = result.prices.reduce((latest, price) => {
            const priceDate = new Date(price.fetchedAt);
            return priceDate > latest ? priceDate : latest;
          }, new Date(0));
          setLastPriceUpdate(mostRecent);
        }
        if (showFeedback) {
          const priceCount = result.prices.length;
          setRefreshFeedback({
            type: "success",
            message: `prices updated for ${priceCount} asset${priceCount === 1 ? "" : "s"}`,
          });
        }
      } else if (showFeedback) {
        setRefreshFeedback({
          type: "error",
          message: result.error || "failed to fetch prices",
        });
      }
    } catch {
      if (showFeedback) {
        setRefreshFeedback({
          type: "error",
          message: "failed to fetch prices",
        });
      }
    }
    setPricesLoading(false);
  }, []);

  // Fetch prices on mount and when investments change
  useEffect(() => {
    if (investments.length > 0) {
      fetchPricesData();
    }
  }, [investments.length, fetchPricesData]);

  const handleRefresh = () => {
    fetchAssets();
    fetchInvestments();
    router.refresh();
  };

  const handleRefreshPrices = (forceRefresh: boolean = false) => {
    fetchPricesData(forceRefresh, true);
  };

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (refreshFeedback) {
      const timer = setTimeout(() => {
        setRefreshFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [refreshFeedback]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    handleRefresh();
  };

  const handleEditSuccess = () => {
    setEditingInvestment(null);
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-[#171717]">investments</h1>
          {investments.length > 0 && (
            <p className="text-xs text-[#a3a3a3] mt-0.5">
              prices updated {formatLastUpdated(lastPriceUpdate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {investments.length > 0 && (
            <button
              onClick={() => handleRefreshPrices(false)}
              disabled={pricesLoading}
              className={`px-3 py-2 text-sm border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] min-h-[40px] flex items-center gap-2 ${
                pricesLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Refresh prices"
            >
              {pricesLoading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
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
                  <span>refreshing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>refresh prices</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[40px]"
          >
            + add investment
          </button>
        </div>
      </div>

      {/* Refresh Feedback Toast */}
      {refreshFeedback && (
        <div
          className={`px-4 py-3 text-sm flex items-center justify-between ${
            refreshFeedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{refreshFeedback.message}</span>
          <button
            onClick={() => setRefreshFeedback(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Portfolio Dashboard */}
      <PortfolioDashboard
        investments={investments}
        prices={prices}
        displayCurrency="USD"
      />

      {/* Tab Navigation */}
      <div className="border-b border-[#e5e5e5]">
        <nav className="flex gap-0 -mb-px overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("holdings")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "holdings"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717] hover:border-[#a3a3a3]"
            }`}
            aria-current={activeTab === "holdings" ? "page" : undefined}
          >
            holdings
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717] hover:border-[#a3a3a3]"
            }`}
            aria-current={activeTab === "history" ? "page" : undefined}
          >
            history
          </button>
          <button
            onClick={() => setActiveTab("dividends")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "dividends"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717] hover:border-[#a3a3a3]"
            }`}
            aria-current={activeTab === "dividends" ? "page" : undefined}
          >
            dividends
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "holdings" && (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="text-sm text-[#737373]">asset library</span>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="search by symbol or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-3 text-sm text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <div className="flex gap-1">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-3 py-2 text-sm min-h-[44px] border ${
                    typeFilter === "ALL"
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  }`}
                >
                  all
                </button>
                <button
                  onClick={() => setTypeFilter("CRYPTO")}
                  className={`px-3 py-2 text-sm min-h-[44px] border ${
                    typeFilter === "CRYPTO"
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  }`}
                >
                  crypto
                </button>
                <button
                  onClick={() => setTypeFilter("STOCK")}
                  className={`px-3 py-2 text-sm min-h-[44px] border ${
                    typeFilter === "STOCK"
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  }`}
                >
                  stocks
                </button>
                <button
                  onClick={() => setTypeFilter("ETF")}
                  className={`px-3 py-2 text-sm min-h-[44px] border ${
                    typeFilter === "ETF"
                      ? "bg-[#171717] text-[#fafafa] border-[#171717]"
                      : "bg-white text-[#737373] border-[#e5e5e5] hover:text-[#171717]"
                  }`}
                >
                  etfs
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#a3a3a3]">loading assets...</p>
            </div>
          ) : (
            <AssetLibraryList assets={assets} onRefresh={handleRefresh} />
          )}

          {/* User's Holdings */}
          <HoldingsView
            investments={investments}
            prices={prices}
            pricesLoading={pricesLoading}
            lastPriceUpdate={lastPriceUpdate}
            onRefresh={handleRefresh}
            onRefreshPrices={handleRefreshPrices}
            onAddInvestment={() => setShowAddModal(true)}
            onEditInvestment={(investment) => setEditingInvestment(investment)}
          />
        </>
      )}

      {activeTab === "history" && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg className="w-6 h-6 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#737373] mb-1">history</p>
          <p className="text-xs text-[#a3a3a3]">portfolio snapshots and performance history will appear here</p>
        </div>
      )}

      {activeTab === "dividends" && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg className="w-6 h-6 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#737373] mb-1">dividends</p>
          <p className="text-xs text-[#a3a3a3]">dividend records and income tracking will appear here</p>
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <AddInvestmentModal
          initialAssets={assets}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Edit Investment Modal */}
      {editingInvestment && (
        <EditInvestmentModal
          investment={editingInvestment}
          onClose={() => setEditingInvestment(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
