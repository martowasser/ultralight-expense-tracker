"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PortfolioSnapshot,
  getPortfolioSnapshots,
  createManualSnapshot,
} from "@/app/investments/actions";

interface HistoryTabProps {
  onRefresh: () => void;
}

interface SnapshotFeedback {
  type: "success" | "error";
  message: string;
}

export default function HistoryTab({ onRefresh }: HistoryTabProps) {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<SnapshotFeedback | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    const result = await getPortfolioSnapshots({ limit: 50 });
    if (result.success && result.snapshots) {
      setSnapshots(result.snapshots);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    setFeedback(null);

    const result = await createManualSnapshot();

    if (result.success && result.snapshot) {
      setFeedback({
        type: "success",
        message: result.wasUpdated
          ? "snapshot updated for today"
          : "snapshot created successfully",
      });
      // Refresh snapshots list
      await fetchSnapshots();
      onRefresh();
    } else {
      setFeedback({
        type: "error",
        message: result.error || "failed to create snapshot",
      });
    }

    setIsCreating(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (costBasis: string, totalValue: string) => {
    const cost = parseFloat(costBasis);
    const value = parseFloat(totalValue);
    if (cost === 0) return "0.00%";
    const percent = ((value - cost) / cost) * 100;
    const sign = percent >= 0 ? "+" : "";
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getGainLossColor = (costBasis: string, totalValue: string) => {
    const cost = parseFloat(costBasis);
    const value = parseFloat(totalValue);
    if (value > cost) return "text-green-600";
    if (value < cost) return "text-red-600";
    return "text-[#737373]";
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#a3a3a3]">loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Snapshot Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-[#737373]">portfolio snapshots</p>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <button
          onClick={handleCreateSnapshot}
          disabled={isCreating}
          className={`px-4 py-2 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[40px] flex items-center gap-2 ${
            isCreating ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isCreating ? (
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
              <span>creating...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>create snapshot</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`px-4 py-3 text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Snapshots List */}
      {snapshots.length === 0 ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f5] mb-4">
            <svg className="w-6 h-6 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#737373] mb-1">no snapshots yet</p>
          <p className="text-xs text-[#a3a3a3] mb-4">
            capture your portfolio&apos;s current state to track performance over time
          </p>
          <button
            onClick={handleCreateSnapshot}
            disabled={isCreating}
            className="px-4 py-2 text-sm text-[#171717] border border-[#e5e5e5] hover:border-[#171717]"
          >
            create your first snapshot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="p-4 border border-[#e5e5e5] bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Date and Holdings Count */}
                <div>
                  <p className="text-sm font-medium text-[#171717]">
                    {formatDate(snapshot.snapshotDate)}
                  </p>
                  <p className="text-xs text-[#a3a3a3] mt-0.5">
                    {snapshot.holdings.length} holding{snapshot.holdings.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Value and Gain/Loss */}
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-[#171717]">
                    {formatCurrency(snapshot.totalValue)}
                  </p>
                  <p className={`text-xs ${getGainLossColor(snapshot.costBasis, snapshot.totalValue)}`}>
                    {formatPercent(snapshot.costBasis, snapshot.totalValue)} from cost
                  </p>
                </div>
              </div>

              {/* Allocation Breakdown */}
              <div className="mt-3 pt-3 border-t border-[#f5f5f5]">
                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-[#a3a3a3]">cost basis: </span>
                    <span className="text-[#737373]">{formatCurrency(snapshot.costBasis)}</span>
                  </div>
                  {parseFloat(snapshot.cryptoValue) > 0 && (
                    <div>
                      <span className="text-[#f59e0b]">crypto: </span>
                      <span className="text-[#737373]">{formatCurrency(snapshot.cryptoValue)}</span>
                    </div>
                  )}
                  {parseFloat(snapshot.stockValue) > 0 && (
                    <div>
                      <span className="text-[#3b82f6]">stocks/ETFs: </span>
                      <span className="text-[#737373]">{formatCurrency(snapshot.stockValue)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
