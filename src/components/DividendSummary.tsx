"use client";

import { DividendSummary as DividendSummaryType } from "@/app/investments/actions";

interface DividendSummaryProps {
  summary: DividendSummaryType | null;
  isLoading: boolean;
}

// Format currency amount
function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

// Format type breakdown for display
function TypeBreakdown({
  byType,
  currency,
}: {
  byType: { regular: number; special: number; capitalGain: number };
  currency: string;
}) {
  const hasAny = byType.regular > 0 || byType.special > 0 || byType.capitalGain > 0;

  if (!hasAny) {
    return <span className="text-xs text-[#a3a3a3]">no dividends</span>;
  }

  const items: { label: string; amount: number }[] = [];
  if (byType.regular > 0) items.push({ label: "Regular", amount: byType.regular });
  if (byType.special > 0) items.push({ label: "Special", amount: byType.special });
  if (byType.capitalGain > 0) items.push({ label: "Capital Gain", amount: byType.capitalGain });

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between text-xs">
          <span className="text-[#737373]">{item.label}</span>
          <span className="text-[#171717]">{formatAmount(item.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DividendSummary({ summary, isLoading }: DividendSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-[#e5e5e5] bg-white animate-pulse">
            <div className="h-3 bg-[#f5f5f5] rounded w-20 mb-2" />
            <div className="h-6 bg-[#f5f5f5] rounded w-24 mb-3" />
            <div className="space-y-2">
              <div className="h-2 bg-[#f5f5f5] rounded w-full" />
              <div className="h-2 bg-[#f5f5f5] rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const currency = summary.displayCurrency;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "short" });

  const cards = [
    {
      label: `YTD (${currentYear})`,
      total: summary.ytdTotal,
      byType: summary.ytdByType,
    },
    {
      label: `This Month (${currentMonth})`,
      total: summary.thisMonthTotal,
      byType: summary.thisMonthByType,
    },
    {
      label: `Last Year (${currentYear - 1})`,
      total: summary.lastYearTotal,
      byType: summary.lastYearByType,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="p-4 border border-[#e5e5e5] bg-white">
          <div className="text-xs text-[#737373] uppercase tracking-wide mb-1">
            {card.label}
          </div>
          <div className="text-xl font-semibold text-[#22c55e] mb-3">
            {formatAmount(card.total, currency)}
          </div>
          <div className="border-t border-[#f5f5f5] pt-2">
            <TypeBreakdown byType={card.byType} currency={currency} />
          </div>
        </div>
      ))}
    </div>
  );
}
