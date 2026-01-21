"use client";

import { useMemo } from "react";
import { Investment, CachedPrice } from "@/app/investments/actions";
import { AssetType } from "@/generated/prisma/enums";

interface PortfolioDashboardProps {
  investments: Investment[];
  prices: CachedPrice[];
  displayCurrency?: string;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cryptoValue: number;
  stockValue: number;
  etfValue: number;
  cryptoPercent: number;
  stockPercent: number;
  etfPercent: number;
  hasData: boolean;
}

export default function PortfolioDashboard({
  investments,
  prices,
  displayCurrency = "USD",
}: PortfolioDashboardProps) {
  // Create a price map for quick lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    prices.forEach((price) => {
      map.set(price.symbol, parseFloat(price.price));
    });
    return map;
  }, [prices]);

  // Calculate portfolio metrics
  const metrics: PortfolioMetrics = useMemo(() => {
    if (investments.length === 0) {
      return {
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        cryptoValue: 0,
        stockValue: 0,
        etfValue: 0,
        cryptoPercent: 0,
        stockPercent: 0,
        etfPercent: 0,
        hasData: false,
      };
    }

    let totalValue = 0;
    let totalCostBasis = 0;
    let cryptoValue = 0;
    let stockValue = 0;
    let etfValue = 0;

    investments.forEach((investment) => {
      const quantity = parseFloat(investment.quantity);
      const purchasePrice = parseFloat(investment.purchasePrice);
      const costBasis = quantity * purchasePrice;
      totalCostBasis += costBasis;

      // Get current price from price map
      const currentPrice = priceMap.get(investment.asset.symbol);
      if (currentPrice !== undefined) {
        const currentValue = quantity * currentPrice;
        totalValue += currentValue;

        // Categorize by asset type
        switch (investment.asset.type) {
          case AssetType.CRYPTO:
            cryptoValue += currentValue;
            break;
          case AssetType.STOCK:
            stockValue += currentValue;
            break;
          case AssetType.ETF:
            etfValue += currentValue;
            break;
        }
      }
    });

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Calculate allocation percentages
    const cryptoPercent = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
    const stockPercent = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
    const etfPercent = totalValue > 0 ? (etfValue / totalValue) * 100 : 0;

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      cryptoValue,
      stockValue,
      etfValue,
      cryptoPercent,
      stockPercent,
      etfPercent,
      hasData: totalValue > 0,
    };
  }, [investments, priceMap]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2);
  };

  // Don't render anything if there are no investments
  if (investments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <span className="text-sm text-[#737373]">portfolio overview</span>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Value */}
        <div className="border border-[#e5e5e5] bg-white p-4">
          <p className="text-xs text-[#737373] mb-1">total value</p>
          <p className="text-lg font-medium text-[#171717]">
            {displayCurrency} {formatCurrency(metrics.totalValue)}
          </p>
        </div>

        {/* Cost Basis */}
        <div className="border border-[#e5e5e5] bg-white p-4">
          <p className="text-xs text-[#737373] mb-1">cost basis</p>
          <p className="text-lg font-medium text-[#171717]">
            {displayCurrency} {formatCurrency(metrics.totalCostBasis)}
          </p>
        </div>

        {/* Gain/Loss */}
        <div className="col-span-2 border border-[#e5e5e5] bg-white p-4">
          <p className="text-xs text-[#737373] mb-1">total gain/loss</p>
          <div className="flex items-baseline gap-3">
            <p
              className={`text-lg font-medium ${
                metrics.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {metrics.totalGainLoss >= 0 ? "+" : ""}
              {displayCurrency} {formatCurrency(Math.abs(metrics.totalGainLoss))}
            </p>
            <span
              className={`text-sm px-2 py-0.5 rounded ${
                metrics.totalGainLoss >= 0
                  ? "text-green-700 bg-green-50"
                  : "text-red-700 bg-red-50"
              }`}
            >
              {metrics.totalGainLoss >= 0 ? "+" : ""}
              {formatPercent(metrics.totalGainLossPercent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      {metrics.hasData && (
        <div className="border border-[#e5e5e5] bg-white p-4">
          <p className="text-xs text-[#737373] mb-3">asset allocation</p>

          {/* Allocation Bar */}
          <div className="h-3 flex rounded overflow-hidden bg-[#f5f5f5]">
            {metrics.cryptoPercent > 0 && (
              <div
                className="bg-[#f59e0b] transition-all"
                style={{ width: `${metrics.cryptoPercent}%` }}
                title={`Crypto: ${formatPercent(metrics.cryptoPercent)}%`}
              />
            )}
            {metrics.stockPercent > 0 && (
              <div
                className="bg-[#3b82f6] transition-all"
                style={{ width: `${metrics.stockPercent}%` }}
                title={`Stocks: ${formatPercent(metrics.stockPercent)}%`}
              />
            )}
            {metrics.etfPercent > 0 && (
              <div
                className="bg-[#10b981] transition-all"
                style={{ width: `${metrics.etfPercent}%` }}
                title={`ETFs: ${formatPercent(metrics.etfPercent)}%`}
              />
            )}
          </div>

          {/* Allocation Legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {metrics.cryptoPercent > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#f59e0b] rounded-sm" />
                <span className="text-[#737373]">
                  crypto: {formatPercent(metrics.cryptoPercent)}%
                </span>
                <span className="text-[#a3a3a3]">
                  ({displayCurrency} {formatCurrency(metrics.cryptoValue)})
                </span>
              </div>
            )}
            {metrics.stockPercent > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#3b82f6] rounded-sm" />
                <span className="text-[#737373]">
                  stocks: {formatPercent(metrics.stockPercent)}%
                </span>
                <span className="text-[#a3a3a3]">
                  ({displayCurrency} {formatCurrency(metrics.stockValue)})
                </span>
              </div>
            )}
            {metrics.etfPercent > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#10b981] rounded-sm" />
                <span className="text-[#737373]">
                  etfs: {formatPercent(metrics.etfPercent)}%
                </span>
                <span className="text-[#a3a3a3]">
                  ({displayCurrency} {formatCurrency(metrics.etfValue)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Price Data Warning */}
      {!metrics.hasData && investments.length > 0 && (
        <div className="border border-[#fef3c7] bg-[#fffbeb] p-4">
          <p className="text-xs text-[#92400e]">
            waiting for price data to calculate portfolio value...
          </p>
        </div>
      )}
    </div>
  );
}
