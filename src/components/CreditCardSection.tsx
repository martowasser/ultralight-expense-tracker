"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreditCardList from "./CreditCardList";
import AddCreditCardModal from "./AddCreditCardModal";
import EditCreditCardModal from "./EditCreditCardModal";
import DeleteCreditCardModal from "./DeleteCreditCardModal";
import { CreditCard, InstitutionOption, deleteCreditCard } from "@/app/credit-cards/actions";

interface CreditCardSectionProps {
  creditCards: CreditCard[];
  institutions: InstitutionOption[];
}

export default function CreditCardSection({
  creditCards,
  institutions,
}: CreditCardSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    router.refresh();
  };

  const handleEditSuccess = () => {
    setEditingCard(null);
    router.refresh();
  };

  const handleDelete = (card: CreditCard) => {
    setDeletingCard(card);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCard) return;
    setIsDeleting(true);

    const result = await deleteCreditCard({ cardId: deletingCard.id });
    setIsDeleting(false);

    if (result.success) {
      setDeletingCard(null);
      router.refresh();
    } else {
      alert(result.error || "failed to delete credit card");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <span className="text-sm text-[#737373]">credit cards</span>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={institutions.length === 0}
          className="px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          add credit card
        </button>
      </div>

      {institutions.length === 0 && (
        <p className="text-sm text-[#a3a3a3]">
          add an institution first before adding credit cards
        </p>
      )}

      <CreditCardList
        creditCards={creditCards}
        onEdit={setEditingCard}
        onDelete={handleDelete}
      />

      {isAddModalOpen && (
        <AddCreditCardModal
          institutions={institutions}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editingCard && (
        <EditCreditCardModal
          card={editingCard}
          institutions={institutions}
          onClose={() => setEditingCard(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingCard && (
        <DeleteCreditCardModal
          card={deletingCard}
          isDeleting={isDeleting}
          onClose={() => setDeletingCard(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
