"use client";

import { Asset } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

interface AssetLibraryListProps {
  assets: Asset[];
  onRefresh?: () => void;
}

const typeLabels: Record<AssetType, string> = {
  CRYPTO: "crypto",
  STOCK: "stocks",
  ETF: "etfs",
};

const typeOrder: AssetType[] = ["CRYPTO", "STOCK", "ETF"];

export default function AssetLibraryList({
  assets,
}: AssetLibraryListProps) {
  if (assets.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#a3a3a3]">no assets found</p>
        <p className="text-xs text-[#a3a3a3] mt-2">try adjusting your search or filters</p>
      </div>
    );
  }

  // Group assets by type
  const groupedByType = typeOrder.reduce((acc, type) => {
    const items = assets.filter((asset) => asset.type === type);
    if (items.length > 0) {
      acc[type] = items;
    }
    return acc;
  }, {} as Record<AssetType, Asset[]>);

  return (
    <div className="space-y-8">
      {typeOrder.map((type) => {
        const items = groupedByType[type];
        if (!items) return null;

        return (
          <div key={type} className="space-y-2">
            <h3 className="text-xs text-[#a3a3a3] uppercase tracking-wide">
              {typeLabels[type]} ({items.length})
            </h3>
            <div className="space-y-1">
              {items.map((asset) => (
                <div
                  key={asset.id}
                  className="py-3 border-b border-[#e5e5e5] last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#171717]">
                          {asset.symbol}
                        </p>
                        {!asset.isGlobal && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-[#e5e5e5] text-[#737373] rounded">
                            custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#737373] mt-0.5">{asset.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#a3a3a3]">
                        precision: {asset.precision}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
