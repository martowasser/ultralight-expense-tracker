"use client";

import { Institution } from "@/app/institutions/actions";

interface DeleteInstitutionModalProps {
  institution: Institution;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteInstitutionModal({
  institution,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteInstitutionModalProps) {
  const hasLinkedItems = institution._count.accounts > 0 || institution._count.creditCards > 0;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">delete institution</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#171717]">
            are you sure you want to delete &ldquo;{institution.name}&rdquo;?
          </p>
          {hasLinkedItems ? (
            <p className="text-sm text-[#a3a3a3]">
              this will also delete{" "}
              {institution._count.accounts > 0 && (
                <span>
                  {institution._count.accounts} account
                  {institution._count.accounts !== 1 ? "s" : ""}
                </span>
              )}
              {institution._count.accounts > 0 && institution._count.creditCards > 0 && " and "}
              {institution._count.creditCards > 0 && (
                <span>
                  {institution._count.creditCards} credit card
                  {institution._count.creditCards !== 1 ? "s" : ""}
                </span>
              )}{" "}
              linked to this institution.
            </p>
          ) : (
            <p className="text-sm text-[#a3a3a3]">
              this action cannot be undone.
            </p>
          )}

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
