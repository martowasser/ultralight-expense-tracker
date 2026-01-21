"use client";

import { useState } from "react";
import { Investment } from "@/app/investments/actions";
import RecordDividendModal from "./RecordDividendModal";

interface DividendsTabProps {
  investments: Investment[];
  onRefresh: () => void;
}

export default function DividendsTab({ investments, onRefresh }: DividendsTabProps) {
  const [showRecordModal, setShowRecordModal] = useState(false);

  const handleRecordSuccess = () => {
    setShowRecordModal(false);
    onRefresh();
  };

  // Check if user has any investments to record dividends against
  const hasInvestments = investments.length > 0;

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

      {/* Empty State */}
      {!hasInvestments ? (
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
      ) : (
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
          <p className="text-sm text-[#737373] mb-1">no dividends recorded</p>
          <p className="text-xs text-[#a3a3a3] mb-4">
            record your first dividend payment to start tracking income
          </p>
          <button
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 text-sm text-[#171717] border border-[#e5e5e5] hover:border-[#a3a3a3]"
          >
            + record dividend
          </button>
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
