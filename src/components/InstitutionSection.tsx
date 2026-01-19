"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InstitutionList from "./InstitutionList";
import AddInstitutionModal from "./AddInstitutionModal";
import EditInstitutionModal from "./EditInstitutionModal";
import DeleteInstitutionModal from "./DeleteInstitutionModal";
import { Institution, deleteInstitution } from "@/app/institutions/actions";

interface InstitutionSectionProps {
  institutions: Institution[];
}

export default function InstitutionSection({
  institutions,
}: InstitutionSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    router.refresh();
  };

  const handleEditSuccess = () => {
    setEditingInstitution(null);
    router.refresh();
  };

  const handleDelete = (institution: Institution) => {
    setDeletingInstitution(institution);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInstitution) return;
    setIsDeleting(true);

    const result = await deleteInstitution({ institutionId: deletingInstitution.id });
    setIsDeleting(false);

    if (result.success) {
      setDeletingInstitution(null);
      router.refresh();
    } else {
      alert(result.error || "failed to delete institution");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <span className="text-sm text-[#737373]">institutions</span>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] min-h-[44px]"
        >
          add institution
        </button>
      </div>

      <InstitutionList
        institutions={institutions}
        onEdit={setEditingInstitution}
        onDelete={handleDelete}
      />

      {isAddModalOpen && (
        <AddInstitutionModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editingInstitution && (
        <EditInstitutionModal
          institution={editingInstitution}
          onClose={() => setEditingInstitution(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingInstitution && (
        <DeleteInstitutionModal
          institution={deletingInstitution}
          isDeleting={isDeleting}
          onClose={() => setDeletingInstitution(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
