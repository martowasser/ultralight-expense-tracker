"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface UserSettings {
  usdToArsRate: number;
}

export async function getUserSettings(): Promise<UserSettings> {
  const session = await auth();

  if (!session?.user?.id) {
    return { usdToArsRate: 1200 };
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  return {
    usdToArsRate: settings?.usdToArsRate ? Number(settings.usdToArsRate) : 1200,
  };
}

export interface UpdateSettingsInput {
  usdToArsRate: number;
}

export interface UpdateSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateSettings(
  input: UpdateSettingsInput
): Promise<UpdateSettingsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (typeof input.usdToArsRate !== "number" || input.usdToArsRate <= 0) {
    return { success: false, error: "Exchange rate must be a positive number" };
  }

  if (input.usdToArsRate > 100000) {
    return { success: false, error: "Exchange rate seems unreasonably high" };
  }

  try {
    // Upsert the settings (create if doesn't exist, update if exists)
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        usdToArsRate: input.usdToArsRate,
      },
      create: {
        userId: session.user.id,
        usdToArsRate: input.usdToArsRate,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
