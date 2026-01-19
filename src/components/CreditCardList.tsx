"use client";

import { CreditCard } from "@/app/credit-cards/actions";
import { CardBrand } from "@/generated/prisma/enums";

interface CreditCardListProps {
  creditCards: CreditCard[];
  onEdit: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
}

const brandLabels: Record<CardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "Amex",
  OTHER: "Other",
};

export default function CreditCardList({
  creditCards,
  onEdit,
  onDelete,
}: CreditCardListProps) {
  if (creditCards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#a3a3a3]">no credit cards yet</p>
      </div>
    );
  }

  // Group credit cards by institution
  const groupedByInstitution = creditCards.reduce((acc, card) => {
    const institutionId = card.institutionId;
    if (!acc[institutionId]) {
      acc[institutionId] = {
        institution: card.institution,
        cards: [],
      };
    }
    acc[institutionId].cards.push(card);
    return acc;
  }, {} as Record<string, { institution: { id: string; name: string }; cards: CreditCard[] }>);

  // Sort institutions by name
  const sortedInstitutions = Object.values(groupedByInstitution).sort((a, b) =>
    a.institution.name.localeCompare(b.institution.name)
  );

  return (
    <div className="space-y-8">
      {sortedInstitutions.map(({ institution, cards }) => (
        <div key={institution.id} className="space-y-2">
          <h3 className="text-xs text-[#a3a3a3] uppercase tracking-wide">
            {institution.name}
          </h3>
          <div className="space-y-1">
            {cards.map((card) => (
              <div
                key={card.id}
                className="py-4 border-b border-[#e5e5e5] last:border-b-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#171717]">
                      {card.name}
                      {card.lastFourDigits && (
                        <span className="text-[#a3a3a3]"> ****{card.lastFourDigits}</span>
                      )}
                    </p>
                    <p className="text-xs text-[#a3a3a3] mt-0.5">
                      {brandLabels[card.brand]} &middot; due day {card.dueDay}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(card)}
                      className="text-sm text-[#a3a3a3] hover:text-[#171717] min-h-[44px] px-1"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => onDelete(card)}
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
      ))}
    </div>
  );
}
