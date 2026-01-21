"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetType } from "@/generated/prisma/enums";

// ==========================================
// Asset Library Types
// ==========================================

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  precision: number;
  isActive: boolean;
  isGlobal: boolean;
  userId: string | null;
  createdAt: Date;
}

export interface GetAssetsInput {
  search?: string;
  type?: AssetType;
  includeInactive?: boolean;
}

export interface GetAssetsResult {
  success: boolean;
  error?: string;
  assets?: Asset[];
}

// ==========================================
// Asset Library Actions
// ==========================================

/**
 * Get all assets available to the user (global + user's custom assets)
 * Supports search by symbol/name and filter by type
 */
export async function getAssets(input?: GetAssetsInput): Promise<GetAssetsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { search, type, includeInactive = false } = input || {};

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: any[] = [];

    // Active status filter
    if (!includeInactive) {
      whereConditions.push({ isActive: true });
    }

    // Type filter
    if (type) {
      whereConditions.push({ type });
    }

    // Search filter (by symbol or name)
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      whereConditions.push({
        OR: [
          { symbol: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
        ],
      });
    }

    // Global assets OR user's custom assets
    whereConditions.push({
      OR: [
        { isGlobal: true },
        { userId: session.user.id },
      ],
    });

    const assets = await prisma.asset.findMany({
      where: {
        AND: whereConditions,
      },
      orderBy: [
        { type: "asc" },
        { symbol: "asc" },
      ],
    });

    return {
      success: true,
      assets: assets.map((asset) => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        precision: asset.precision,
        isActive: asset.isActive,
        isGlobal: asset.isGlobal,
        userId: asset.userId,
        createdAt: asset.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching assets:", error);
    return { success: false, error: "Failed to fetch assets" };
  }
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(assetId: string): Promise<{ success: boolean; error?: string; asset?: Asset }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!assetId) {
    return { success: false, error: "Asset ID is required" };
  }

  try {
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        OR: [
          { isGlobal: true },
          { userId: session.user.id },
        ],
      },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    return {
      success: true,
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        precision: asset.precision,
        isActive: asset.isActive,
        isGlobal: asset.isGlobal,
        userId: asset.userId,
        createdAt: asset.createdAt,
      },
    };
  } catch (error) {
    console.error("Error fetching asset:", error);
    return { success: false, error: "Failed to fetch asset" };
  }
}
