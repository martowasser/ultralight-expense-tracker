"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Currency } from "@/generated/prisma/enums";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  institutionId: string;
  createdAt: Date;
}

export interface CreateAccountInput {
  institutionId: string;
  name: string;
  currency: Currency;
}

export interface CreateAccountResult {
  success: boolean;
  error?: string;
}

export async function createAccount(
  input: CreateAccountInput
): Promise<CreateAccountResult> {
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

  const validCurrencies: Currency[] = ["ARS", "USD"];
  if (!validCurrencies.includes(input.currency)) {
    return { success: false, error: "Invalid currency" };
  }

  try {
    // Verify the institution belongs to this user
    const institution = await prisma.institution.findUnique({
      where: { id: input.institutionId },
    });

    if (!institution || institution.userId !== session.user.id) {
      return { success: false, error: "Institution not found" };
    }

    await prisma.account.create({
      data: {
        userId: session.user.id,
        institutionId: input.institutionId,
        name: input.name.trim(),
        currency: input.currency,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating account:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export interface UpdateAccountInput {
  accountId: string;
  name: string;
  currency: Currency;
}

export interface UpdateAccountResult {
  success: boolean;
  error?: string;
}

export async function updateAccount(
  input: UpdateAccountInput
): Promise<UpdateAccountResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.accountId) {
    return { success: false, error: "Account ID is required" };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const validCurrencies: Currency[] = ["ARS", "USD"];
  if (!validCurrencies.includes(input.currency)) {
    return { success: false, error: "Invalid currency" };
  }

  try {
    // Verify ownership before updating
    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return { success: false, error: "Account not found" };
    }

    await prisma.account.update({
      where: { id: input.accountId },
      data: {
        name: input.name.trim(),
        currency: input.currency,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, error: "Failed to update account" };
  }
}

export interface DeleteAccountInput {
  accountId: string;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export async function deleteAccount(
  input: DeleteAccountInput
): Promise<DeleteAccountResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.accountId) {
    return { success: false, error: "Account ID is required" };
  }

  try {
    // Verify ownership before deleting
    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return { success: false, error: "Account not found" };
    }

    await prisma.account.delete({
      where: { id: input.accountId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
