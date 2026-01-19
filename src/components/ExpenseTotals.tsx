"use client";

interface CurrencyTotals {
  ars: { paid: number; unpaid: number };
  usd: { paid: number; unpaid: number };
}

interface ExpenseTotalsProps {
  totals: CurrencyTotals;
  exchangeRate: number;
}

function formatARS(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUSD(amount: number): string {
  return `US$${amount.toFixed(2)}`;
}

export default function ExpenseTotals({ totals, exchangeRate }: ExpenseTotalsProps) {
  const arsPaid = totals.ars.paid;
  const arsUnpaid = totals.ars.unpaid;
  const arsTotal = arsPaid + arsUnpaid;

  const usdPaid = totals.usd.paid;
  const usdUnpaid = totals.usd.unpaid;
  const usdTotal = usdPaid + usdUnpaid;

  const hasUSD = usdTotal > 0;

  // Calculate combined totals in ARS (for summary)
  const combinedPaidARS = arsPaid + (usdPaid * exchangeRate);
  const combinedUnpaidARS = arsUnpaid + (usdUnpaid * exchangeRate);
  const combinedTotalARS = combinedPaidARS + combinedUnpaidARS;

  return (
    <div className="space-y-4 py-4 border-b border-[#e5e5e5]">
      {/* ARS Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-[#a3a3a3]">paid (ARS)</p>
          <p className="text-sm text-[#171717] tabular-nums mt-1">{formatARS(arsPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-[#a3a3a3]">unpaid (ARS)</p>
          <p className="text-sm text-[#171717] tabular-nums mt-1">{formatARS(arsUnpaid)}</p>
        </div>
        <div>
          <p className="text-xs text-[#a3a3a3]">total (ARS)</p>
          <p className="text-sm text-[#171717] tabular-nums mt-1">{formatARS(arsTotal)}</p>
        </div>
      </div>

      {/* USD Totals - only show if there are USD expenses */}
      {hasUSD && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#a3a3a3]">paid (USD)</p>
            <p className="text-sm text-[#171717] tabular-nums mt-1">{formatUSD(usdPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-[#a3a3a3]">unpaid (USD)</p>
            <p className="text-sm text-[#171717] tabular-nums mt-1">{formatUSD(usdUnpaid)}</p>
          </div>
          <div>
            <p className="text-xs text-[#a3a3a3]">total (USD)</p>
            <p className="text-sm text-[#171717] tabular-nums mt-1">{formatUSD(usdTotal)}</p>
          </div>
        </div>
      )}

      {/* Combined ARS equivalent - only show if there are USD expenses */}
      {hasUSD && (
        <div className="pt-2 border-t border-[#e5e5e5]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#a3a3a3]">combined paid</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">≈ {formatARS(combinedPaidARS)}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3a3a3]">combined unpaid</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">≈ {formatARS(combinedUnpaidARS)}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3a3a3]">combined total</p>
              <p className="text-sm text-[#171717] tabular-nums mt-1">≈ {formatARS(combinedTotalARS)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
