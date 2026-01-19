"use client";

import { Institution } from "@/app/institutions/actions";
import { InstitutionType } from "@/generated/prisma/enums";

interface InstitutionListProps {
  institutions: Institution[];
  onEdit: (institution: Institution) => void;
  onDelete: (institution: Institution) => void;
}

const typeLabels: Record<InstitutionType, string> = {
  BANK: "bank",
  FINTECH: "fintech",
  CRYPTO_EXCHANGE: "crypto exchange",
  PAYMENT_PLATFORM: "payment platform",
};

const typeOrder: InstitutionType[] = ["BANK", "FINTECH", "CRYPTO_EXCHANGE", "PAYMENT_PLATFORM"];

export default function InstitutionList({
  institutions,
  onEdit,
  onDelete,
}: InstitutionListProps) {
  if (institutions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#a3a3a3]">no institutions yet</p>
      </div>
    );
  }

  // Group institutions by type
  const groupedByType = typeOrder.reduce((acc, type) => {
    const items = institutions.filter((inst) => inst.type === type);
    if (items.length > 0) {
      acc[type] = items;
    }
    return acc;
  }, {} as Record<InstitutionType, Institution[]>);

  return (
    <div className="space-y-8">
      {typeOrder.map((type) => {
        const items = groupedByType[type];
        if (!items) return null;

        return (
          <div key={type} className="space-y-2">
            <h3 className="text-xs text-[#a3a3a3] uppercase tracking-wide">
              {typeLabels[type]}
            </h3>
            <div className="space-y-1">
              {items.map((institution) => (
                <div
                  key={institution.id}
                  className="py-4 border-b border-[#e5e5e5] last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#171717]">{institution.name}</p>
                      {(institution._count.accounts > 0 || institution._count.creditCards > 0) && (
                        <p className="text-xs text-[#a3a3a3] mt-0.5">
                          {institution._count.accounts > 0 && (
                            <span>{institution._count.accounts} account{institution._count.accounts !== 1 ? "s" : ""}</span>
                          )}
                          {institution._count.accounts > 0 && institution._count.creditCards > 0 && (
                            <span> &middot; </span>
                          )}
                          {institution._count.creditCards > 0 && (
                            <span>{institution._count.creditCards} card{institution._count.creditCards !== 1 ? "s" : ""}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(institution)}
                        className="text-sm text-[#a3a3a3] hover:text-[#171717] min-h-[44px] px-1"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => onDelete(institution)}
                        className="text-sm text-[#a3a3a3] hover:text-[#171717] min-h-[44px] px-1"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
