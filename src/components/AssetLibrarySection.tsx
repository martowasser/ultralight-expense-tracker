"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AssetLibraryList from "./AssetLibraryList";
import AddInvestmentModal from "./AddInvestmentModal";
import HoldingsView from "./HoldingsView";
import { Asset, Investment, CachedPrice, getAssets, getInvestments, GetAssetsInput, fetchAssetPrices, clearPriceCache } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

interface AssetLibrarySectionProps {
  initialAssets: Asset[];
  initialInvestments: Investment[];
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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const fetchPricesData = useCallback(async (forceRefresh: boolean = false) => {
    setPricesLoading(true);

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
    fetchPricesData(forceRefresh);
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Add Investment Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[44px]"
        >
          + add investment
        </button>
      </div>

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
      />

      {/* Add Investment Modal */}
      {showAddModal && (
        <AddInvestmentModal
          initialAssets={assets}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
