"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetType, Currency } from "@/generated/prisma/enums";

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

// ==========================================
// Investment Types
// ==========================================

export interface Investment {
  id: string;
  userId: string;
  assetId: string;
  quantity: string;
  purchasePrice: string;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  platform: string;
  notes: string | null;
  createdAt: Date;
  asset: Asset;
}

export interface CreateInvestmentInput {
  assetId: string;
  quantity: string;
  purchasePrice: string;
  purchaseCurrency: Currency;
  purchaseDate: string;
  platform: string;
  notes?: string;
}

export interface CreateInvestmentResult {
  success: boolean;
  error?: string;
  investment?: Investment;
}

// ==========================================
// Investment Actions
// ==========================================

/**
 * Create a new investment
 */
export async function createInvestment(input: CreateInvestmentInput): Promise<CreateInvestmentResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { assetId, quantity, purchasePrice, purchaseCurrency, purchaseDate, platform, notes } = input;

  // Validate required fields
  if (!assetId) {
    return { success: false, error: "Asset is required" };
  }

  if (!quantity || quantity.trim() === "") {
    return { success: false, error: "Quantity is required" };
  }

  const quantityNum = parseFloat(quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return { success: false, error: "Quantity must be a positive number" };
  }

  if (!purchasePrice || purchasePrice.trim() === "") {
    return { success: false, error: "Purchase price is required" };
  }

  const priceNum = parseFloat(purchasePrice);
  if (isNaN(priceNum) || priceNum <= 0) {
    return { success: false, error: "Purchase price must be a positive number" };
  }

  if (!purchaseDate) {
    return { success: false, error: "Purchase date is required" };
  }

  if (!platform || platform.trim() === "") {
    return { success: false, error: "Platform is required" };
  }

  try {
    // Verify asset exists and is accessible
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        isActive: true,
        OR: [
          { isGlobal: true },
          { userId: session.user.id },
        ],
      },
    });

    if (!asset) {
      return { success: false, error: "Asset not found or not accessible" };
    }

    // Validate quantity precision based on asset type
    const decimalPlaces = quantity.includes(".") ? quantity.split(".")[1].length : 0;
    if (decimalPlaces > asset.precision) {
      return {
        success: false,
        error: `Quantity can have at most ${asset.precision} decimal places for ${asset.symbol}`
      };
    }

    // Create the investment
    const investment = await prisma.investment.create({
      data: {
        userId: session.user.id,
        assetId,
        quantity: quantityNum,
        purchasePrice: priceNum,
        purchaseCurrency,
        purchaseDate: new Date(purchaseDate),
        platform: platform.trim(),
        notes: notes?.trim() || null,
      },
      include: {
        asset: true,
      },
    });

    return {
      success: true,
      investment: {
        id: investment.id,
        userId: investment.userId,
        assetId: investment.assetId,
        quantity: investment.quantity.toString(),
        purchasePrice: investment.purchasePrice.toString(),
        purchaseCurrency: investment.purchaseCurrency,
        purchaseDate: investment.purchaseDate,
        platform: investment.platform,
        notes: investment.notes,
        createdAt: investment.createdAt,
        asset: {
          id: investment.asset.id,
          symbol: investment.asset.symbol,
          name: investment.asset.name,
          type: investment.asset.type,
          precision: investment.asset.precision,
          isActive: investment.asset.isActive,
          isGlobal: investment.asset.isGlobal,
          userId: investment.asset.userId,
          createdAt: investment.asset.createdAt,
        },
      },
    };
  } catch (error) {
    console.error("Error creating investment:", error);
    return { success: false, error: "Failed to create investment" };
  }
}
