"use client";

import { CreditCard } from "@/app/credit-cards/actions";

interface DeleteCreditCardModalProps {
  card: CreditCard;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteCreditCardModal({
  card,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteCreditCardModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">delete credit card</h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-[#171717]">
            are you sure you want to delete{" "}
            <span className="font-medium">{card.name}</span>
            {card.lastFourDigits && (
              <span className="text-[#a3a3a3]"> ****{card.lastFourDigits}</span>
            )}
            ?
          </p>
          <p className="text-sm text-[#a3a3a3]">
            this action cannot be undone. expenses linked to this card will have their card reference removed.
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
            >
              {isDeleting ? "deleting..." : "delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
