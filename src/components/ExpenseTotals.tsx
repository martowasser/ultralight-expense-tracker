"use client";

interface ExpenseTotalsProps {
  paidTotal: number;
  unpaidTotal: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ExpenseTotals({ paidTotal, unpaidTotal }: ExpenseTotalsProps) {
  const grandTotal = paidTotal + unpaidTotal;

  return (
    <div className="grid grid-cols-3 gap-4 py-4 border-b border-[#e5e5e5]">
      <div>
        <p className="text-xs text-[#a3a3a3]">paid</p>
        <p className="text-sm text-[#171717] tabular-nums mt-1">{formatCurrency(paidTotal)}</p>
      </div>
      <div>
        <p className="text-xs text-[#a3a3a3]">unpaid</p>
        <p className="text-sm text-[#171717] tabular-nums mt-1">{formatCurrency(unpaidTotal)}</p>
      </div>
      <div>
        <p className="text-xs text-[#a3a3a3]">total</p>
        <p className="text-sm text-[#171717] tabular-nums mt-1">{formatCurrency(grandTotal)}</p>
      </div>
    </div>
  );
}
