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
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Monthly Summary</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(paidTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Unpaid</p>
          <p className="text-lg font-semibold text-yellow-600">{formatCurrency(unpaidTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
}
