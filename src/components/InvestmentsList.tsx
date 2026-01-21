"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Investment } from "@/app/investments/actions";
import DeleteInvestmentModal from "./DeleteInvestmentModal";

interface InvestmentsListProps {
  investments: Investment[];
  onRefresh: () => void;
}

export default function InvestmentsList({
  investments,
  onRefresh,
}: InvestmentsListProps) {
  const [deleteInvestmentId, setDeleteInvestmentId] = useState<string | null>(null);
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

  if (investments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#737373]">your investments</span>
        <span className="text-xs text-[#a3a3a3]">{investments.length} lot{investments.length === 1 ? "" : "s"}</span>
      </div>

      <div className="border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
        {investments.map((investment) => {
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
