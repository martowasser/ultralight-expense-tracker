"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AssetLibraryList from "./AssetLibraryList";
import { Asset, getAssets, GetAssetsInput } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

interface AssetLibrarySectionProps {
  initialAssets: Asset[];
}

export default function AssetLibrarySection({
  initialAssets,
}: AssetLibrarySectionProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleRefresh = () => {
    fetchAssets();
    router.refresh();
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
