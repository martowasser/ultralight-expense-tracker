"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CardBrand } from "@/generated/prisma/enums";

export interface CreditCardInstitution {
  id: string;
  name: string;
}

export interface CreditCard {
  id: string;
  name: string;
  brand: CardBrand;
  lastFourDigits: string | null;
  dueDay: number;
  institutionId: string;
  institution: CreditCardInstitution;
  createdAt: Date;
}

export interface CreateCreditCardInput {
  institutionId: string;
  name: string;
  brand: CardBrand;
  lastFourDigits?: string;
  dueDay: number;
}

export interface CreateCreditCardResult {
  success: boolean;
  error?: string;
}

export async function createCreditCard(
  input: CreateCreditCardInput
): Promise<CreateCreditCardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.institutionId) {
    return { success: false, error: "Institution is required" };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const validBrands: CardBrand[] = ["VISA", "MASTERCARD", "AMEX", "OTHER"];
  if (!validBrands.includes(input.brand)) {
    return { success: false, error: "Invalid card brand" };
  }

  if (!input.dueDay || input.dueDay < 1 || input.dueDay > 31) {
    return { success: false, error: "Due day must be between 1 and 31" };
  }

  if (input.lastFourDigits && !/^\d{4}$/.test(input.lastFourDigits)) {
    return { success: false, error: "Last 4 digits must be exactly 4 numbers" };
  }

  try {
    // Verify institution belongs to user
    const institution = await prisma.institution.findUnique({
      where: { id: input.institutionId },
    });

    if (!institution || institution.userId !== session.user.id) {
      return { success: false, error: "Institution not found" };
    }

    await prisma.creditCard.create({
      data: {
        userId: session.user.id,
        institutionId: input.institutionId,
        name: input.name.trim(),
        brand: input.brand,
        lastFourDigits: input.lastFourDigits || null,
        dueDay: input.dueDay,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating credit card:", error);
    return { success: false, error: "Failed to create credit card" };
  }
}

export interface UpdateCreditCardInput {
  cardId: string;
  institutionId: string;
  name: string;
  brand: CardBrand;
  lastFourDigits?: string;
  dueDay: number;
}

export interface UpdateCreditCardResult {
  success: boolean;
  error?: string;
}

export async function updateCreditCard(
  input: UpdateCreditCardInput
): Promise<UpdateCreditCardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.cardId) {
    return { success: false, error: "Card ID is required" };
  }

  if (!input.institutionId) {
    return { success: false, error: "Institution is required" };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const validBrands: CardBrand[] = ["VISA", "MASTERCARD", "AMEX", "OTHER"];
  if (!validBrands.includes(input.brand)) {
    return { success: false, error: "Invalid card brand" };
  }

  if (!input.dueDay || input.dueDay < 1 || input.dueDay > 31) {
    return { success: false, error: "Due day must be between 1 and 31" };
  }

  if (input.lastFourDigits && !/^\d{4}$/.test(input.lastFourDigits)) {
    return { success: false, error: "Last 4 digits must be exactly 4 numbers" };
  }

  try {
    // Verify ownership
    const card = await prisma.creditCard.findUnique({
      where: { id: input.cardId },
    });

    if (!card || card.userId !== session.user.id) {
      return { success: false, error: "Credit card not found" };
    }

    // Verify institution belongs to user
    const institution = await prisma.institution.findUnique({
      where: { id: input.institutionId },
    });

    if (!institution || institution.userId !== session.user.id) {
      return { success: false, error: "Institution not found" };
    }

    await prisma.creditCard.update({
      where: { id: input.cardId },
      data: {
        institutionId: input.institutionId,
        name: input.name.trim(),
        brand: input.brand,
        lastFourDigits: input.lastFourDigits || null,
        dueDay: input.dueDay,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating credit card:", error);
    return { success: false, error: "Failed to update credit card" };
  }
}

export interface DeleteCreditCardInput {
  cardId: string;
}

export interface DeleteCreditCardResult {
  success: boolean;
  error?: string;
}

export async function deleteCreditCard(
  input: DeleteCreditCardInput
): Promise<DeleteCreditCardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.cardId) {
    return { success: false, error: "Card ID is required" };
  }

  try {
    // Verify ownership
    const card = await prisma.creditCard.findUnique({
      where: { id: input.cardId },
    });

    if (!card || card.userId !== session.user.id) {
      return { success: false, error: "Credit card not found" };
    }

    await prisma.creditCard.delete({
      where: { id: input.cardId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return { success: false, error: "Failed to delete credit card" };
  }
}

export async function getCreditCards(): Promise<CreditCard[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    include: {
      institution: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { institution: { name: "asc" } },
      { name: "asc" },
    ],
  });

  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    brand: card.brand,
    lastFourDigits: card.lastFourDigits,
    dueDay: card.dueDay,
    institutionId: card.institutionId,
    institution: {
      id: card.institution.id,
      name: card.institution.name,
    },
    createdAt: card.createdAt,
  }));
}

export interface InstitutionOption {
  id: string;
  name: string;
}

export async function getInstitutionsForSelect(): Promise<InstitutionOption[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const institutions = await prisma.institution.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return institutions;
}
