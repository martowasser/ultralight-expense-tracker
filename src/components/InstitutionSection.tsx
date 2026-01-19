"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InstitutionList from "./InstitutionList";
import AddInstitutionModal from "./AddInstitutionModal";
import EditInstitutionModal from "./EditInstitutionModal";
import DeleteInstitutionModal from "./DeleteInstitutionModal";
import AddAccountModal from "./AddAccountModal";
import EditAccountModal from "./EditAccountModal";
import DeleteAccountModal from "./DeleteAccountModal";
import { Institution, InstitutionAccount, deleteInstitution } from "@/app/institutions/actions";
import { deleteAccount } from "@/app/institutions/account-actions";

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

  // Account states
  const [addingAccountToInstitution, setAddingAccountToInstitution] = useState<Institution | null>(null);
  const [editingAccount, setEditingAccount] = useState<InstitutionAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<InstitutionAccount | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  // Account handlers
  const handleAddAccountSuccess = () => {
    setAddingAccountToInstitution(null);
    router.refresh();
  };

  const handleEditAccountSuccess = () => {
    setEditingAccount(null);
    router.refresh();
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeletingAccount(true);

    const result = await deleteAccount({ accountId: deletingAccount.id });
    setIsDeletingAccount(false);

    if (result.success) {
      setDeletingAccount(null);
      router.refresh();
    } else {
      alert(result.error || "failed to delete account");
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
        onAddAccount={setAddingAccountToInstitution}
        onEditAccount={setEditingAccount}
        onDeleteAccount={setDeletingAccount}
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

      {addingAccountToInstitution && (
        <AddAccountModal
          institutionId={addingAccountToInstitution.id}
          institutionName={addingAccountToInstitution.name}
          onClose={() => setAddingAccountToInstitution(null)}
          onSuccess={handleAddAccountSuccess}
        />
      )}

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={handleEditAccountSuccess}
        />
      )}

      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          isDeleting={isDeletingAccount}
          onClose={() => setDeletingAccount(null)}
          onConfirm={handleConfirmDeleteAccount}
        />
      )}
    </div>
  );
}
