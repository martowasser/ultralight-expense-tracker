"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InstitutionType } from "@/generated/prisma/enums";

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  createdAt: Date;
  _count: {
    accounts: number;
    creditCards: number;
  };
}

export interface CreateInstitutionInput {
  name: string;
  type: InstitutionType;
}

export interface CreateInstitutionResult {
  success: boolean;
  error?: string;
}

export async function createInstitution(
  input: CreateInstitutionInput
): Promise<CreateInstitutionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const validTypes: InstitutionType[] = ["BANK", "FINTECH", "CRYPTO_EXCHANGE", "PAYMENT_PLATFORM"];
  if (!validTypes.includes(input.type)) {
    return { success: false, error: "Invalid institution type" };
  }

  try {
    await prisma.institution.create({
      data: {
        userId: session.user.id,
        name: input.name.trim(),
        type: input.type,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating institution:", error);
    return { success: false, error: "Failed to create institution" };
  }
}

export interface UpdateInstitutionInput {
  institutionId: string;
  name: string;
  type: InstitutionType;
}

export interface UpdateInstitutionResult {
  success: boolean;
  error?: string;
}

export async function updateInstitution(
  input: UpdateInstitutionInput
): Promise<UpdateInstitutionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.institutionId) {
    return { success: false, error: "Institution ID is required" };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const validTypes: InstitutionType[] = ["BANK", "FINTECH", "CRYPTO_EXCHANGE", "PAYMENT_PLATFORM"];
  if (!validTypes.includes(input.type)) {
    return { success: false, error: "Invalid institution type" };
  }

  try {
    // Verify ownership before updating
    const institution = await prisma.institution.findUnique({
      where: { id: input.institutionId },
    });

    if (!institution || institution.userId !== session.user.id) {
      return { success: false, error: "Institution not found" };
    }

    await prisma.institution.update({
      where: { id: input.institutionId },
      data: {
        name: input.name.trim(),
        type: input.type,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating institution:", error);
    return { success: false, error: "Failed to update institution" };
  }
}

export interface DeleteInstitutionInput {
  institutionId: string;
}

export interface DeleteInstitutionResult {
  success: boolean;
  error?: string;
}

export async function deleteInstitution(
  input: DeleteInstitutionInput
): Promise<DeleteInstitutionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.institutionId) {
    return { success: false, error: "Institution ID is required" };
  }

  try {
    // Verify ownership before deleting
    const institution = await prisma.institution.findUnique({
      where: { id: input.institutionId },
    });

    if (!institution || institution.userId !== session.user.id) {
      return { success: false, error: "Institution not found" };
    }

    // Delete the institution - accounts and credit cards will be cascade deleted
    await prisma.institution.delete({
      where: { id: input.institutionId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting institution:", error);
    return { success: false, error: "Failed to delete institution" };
  }
}

export async function getInstitutions(): Promise<Institution[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const institutions = await prisma.institution.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          accounts: true,
          creditCards: true,
        },
      },
    },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
  });

  return institutions.map((inst) => ({
    id: inst.id,
    name: inst.name,
    type: inst.type,
    createdAt: inst.createdAt,
    _count: inst._count,
  }));
}
