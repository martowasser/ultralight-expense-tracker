"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetType, Currency } from "@/generated/prisma/enums";
import { fetchPrices as fetchPricesFromAPIs, PriceData } from "@/lib/priceService";

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

// ==========================================
// Create Custom Asset Types
// ==========================================

export interface CreateCustomAssetInput {
  symbol: string;
  name: string;
  type: AssetType;
  precision: number;
}

export interface CreateCustomAssetResult {
  success: boolean;
  error?: string;
  asset?: Asset;
}

// ==========================================
// Create Custom Asset Action
// ==========================================

/**
 * Create a custom asset for the user
 * Custom assets appear only in user's library and support manual price entry
 */
export async function createCustomAsset(input: CreateCustomAssetInput): Promise<CreateCustomAssetResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { symbol, name, type, precision } = input;

  // Validate required fields
  if (!symbol || symbol.trim() === "") {
    return { success: false, error: "Symbol is required" };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  // Validate symbol format (alphanumeric, 1-10 characters)
  if (!/^[A-Z0-9]{1,10}$/.test(normalizedSymbol)) {
    return { success: false, error: "Symbol must be 1-10 alphanumeric characters" };
  }

  if (!name || name.trim() === "") {
    return { success: false, error: "Name is required" };
  }

  if (name.trim().length > 100) {
    return { success: false, error: "Name must be 100 characters or less" };
  }

  if (!type) {
    return { success: false, error: "Asset type is required" };
  }

  if (!["CRYPTO", "STOCK", "ETF"].includes(type)) {
    return { success: false, error: "Invalid asset type" };
  }

  if (precision === undefined || precision === null) {
    return { success: false, error: "Precision is required" };
  }

  if (!Number.isInteger(precision) || precision < 0 || precision > 8) {
    return { success: false, error: "Precision must be an integer between 0 and 8" };
  }

  try {
    // Check for duplicate symbols (across all assets - global and user's custom)
    const existingAsset = await prisma.asset.findFirst({
      where: {
        symbol: normalizedSymbol,
        OR: [
          { isGlobal: true },
          { userId: session.user.id },
        ],
      },
    });

    if (existingAsset) {
      return { success: false, error: `Asset with symbol "${normalizedSymbol}" already exists` };
    }

    // Create the custom asset
    const asset = await prisma.asset.create({
      data: {
        symbol: normalizedSymbol,
        name: name.trim(),
        type,
        precision,
        isActive: true,
        isGlobal: false, // Custom assets are not global
        userId: session.user.id,
      },
    });

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
    console.error("Error creating custom asset:", error);
    return { success: false, error: "Failed to create custom asset" };
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
export interface GetInvestmentsResult {
  success: boolean;
  error?: string;
  investments?: Investment[];
}

/**
 * Get all investments for the current user
 */
export async function getInvestments(): Promise<GetInvestmentsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      investments: investments.map((inv) => ({
        id: inv.id,
        userId: inv.userId,
        assetId: inv.assetId,
        quantity: inv.quantity.toString(),
        purchasePrice: inv.purchasePrice.toString(),
        purchaseCurrency: inv.purchaseCurrency,
        purchaseDate: inv.purchaseDate,
        platform: inv.platform,
        notes: inv.notes,
        createdAt: inv.createdAt,
        asset: {
          id: inv.asset.id,
          symbol: inv.asset.symbol,
          name: inv.asset.name,
          type: inv.asset.type,
          precision: inv.asset.precision,
          isActive: inv.asset.isActive,
          isGlobal: inv.asset.isGlobal,
          userId: inv.asset.userId,
          createdAt: inv.asset.createdAt,
        },
      })),
    };
  } catch (error) {
    console.error("Error fetching investments:", error);
    return { success: false, error: "Failed to fetch investments" };
  }
}

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

// ==========================================
// Update Investment Types
// ==========================================

export interface UpdateInvestmentInput {
  id: string;
  quantity: string;
  purchasePrice: string;
  purchaseCurrency: Currency;
  purchaseDate: string;
  platform: string;
  notes?: string;
}

export interface UpdateInvestmentResult {
  success: boolean;
  error?: string;
  investment?: Investment;
}

// ==========================================
// Update Investment Action
// ==========================================

/**
 * Update an existing investment
 * Note: Cannot edit symbol or asset type (must delete and recreate)
 */
export async function updateInvestment(input: UpdateInvestmentInput): Promise<UpdateInvestmentResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { id, quantity, purchasePrice, purchaseCurrency, purchaseDate, platform, notes } = input;

  // Validate required fields
  if (!id) {
    return { success: false, error: "Investment ID is required" };
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
    // Find the existing investment and verify ownership
    const existingInvestment = await prisma.investment.findFirst({
      where: {
        id,
        userId: session.user.id, // Cannot edit other users' investments
      },
      include: {
        asset: true,
      },
    });

    if (!existingInvestment) {
      return { success: false, error: "Investment not found" };
    }

    // Validate quantity precision based on asset type
    const decimalPlaces = quantity.includes(".") ? quantity.split(".")[1].length : 0;
    if (decimalPlaces > existingInvestment.asset.precision) {
      return {
        success: false,
        error: `Quantity can have at most ${existingInvestment.asset.precision} decimal places for ${existingInvestment.asset.symbol}`
      };
    }

    // Update the investment
    const investment = await prisma.investment.update({
      where: { id },
      data: {
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
    console.error("Error updating investment:", error);
    return { success: false, error: "Failed to update investment" };
  }
}

// ==========================================
// Delete Investment Types
// ==========================================

export interface DeleteInvestmentCheckResult {
  success: boolean;
  error?: string;
  hasDividends?: boolean;
  dividendCount?: number;
  investment?: Investment;
}

export interface DeleteInvestmentResult {
  success: boolean;
  error?: string;
  deletedDividends?: number;
}

// ==========================================
// Delete Investment Actions
// ==========================================

/**
 * Check if an investment can be deleted and get info about associated dividends
 */
export async function checkInvestmentForDeletion(investmentId: string): Promise<DeleteInvestmentCheckResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!investmentId) {
    return { success: false, error: "Investment ID is required" };
  }

  try {
    // Find the investment and ensure it belongs to the current user
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId: session.user.id, // Cannot delete other users' investments
      },
      include: {
        asset: true,
        dividends: true,
      },
    });

    if (!investment) {
      return { success: false, error: "Investment not found" };
    }

    const dividendCount = investment.dividends.length;

    return {
      success: true,
      hasDividends: dividendCount > 0,
      dividendCount,
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
    console.error("Error checking investment for deletion:", error);
    return { success: false, error: "Failed to check investment" };
  }
}

/**
 * Delete an investment and all associated dividends
 */
export async function deleteInvestment(investmentId: string): Promise<DeleteInvestmentResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!investmentId) {
    return { success: false, error: "Investment ID is required" };
  }

  try {
    // Find the investment and ensure it belongs to the current user
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId: session.user.id, // Cannot delete other users' investments
      },
      include: {
        dividends: true,
      },
    });

    if (!investment) {
      return { success: false, error: "Investment not found" };
    }

    const dividendCount = investment.dividends.length;

    // Delete the investment (dividends will be cascade deleted due to schema relation)
    await prisma.investment.delete({
      where: { id: investmentId },
    });

    return {
      success: true,
      deletedDividends: dividendCount,
    };
  } catch (error) {
    console.error("Error deleting investment:", error);
    return { success: false, error: "Failed to delete investment" };
  }
}

// ==========================================
// Price Fetching Types
// ==========================================

export interface CachedPrice {
  symbol: string;
  price: string;
  change24h: string | null;
  source: string;
  fetchedAt: Date;
}

export interface FetchAssetPricesResult {
  success: boolean;
  error?: string;
  prices?: CachedPrice[];
  fromCache?: boolean;
  usedStaleCache?: boolean;
}

// ==========================================
// Price Fetching Actions
// ==========================================

/**
 * Fetch prices for user's portfolio assets
 * Uses PriceCache to store/retrieve prices with 5-minute TTL
 * Falls back to stale cache on API failure (graceful degradation)
 */
export async function fetchAssetPrices(forceRefresh: boolean = false): Promise<FetchAssetPricesResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get unique assets from user's investments
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { asset: true },
    });

    if (investments.length === 0) {
      return { success: true, prices: [], fromCache: false };
    }

    // Get unique symbols with their types
    const assetMap = new Map<string, { symbol: string; type: AssetType }>();
    investments.forEach((inv) => {
      if (!assetMap.has(inv.asset.symbol)) {
        assetMap.set(inv.asset.symbol, {
          symbol: inv.asset.symbol,
          type: inv.asset.type,
        });
      }
    });

    const symbols = Array.from(assetMap.keys());

    // Check cache first (5 minute TTL)
    const cacheExpiry = new Date(Date.now() - 5 * 60 * 1000);

    // Get all cached prices (for fallback)
    const allCachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });

    // Filter for fresh cached prices
    const freshCachedPrices = forceRefresh
      ? [] // Skip cache on force refresh
      : allCachedPrices.filter((p) => p.fetchedAt >= cacheExpiry);

    const cachedSymbols = new Set(freshCachedPrices.map((p) => p.symbol));
    const symbolsToFetch = symbols.filter((s) => !cachedSymbols.has(s));

    let freshPrices: PriceData[] = [];
    let usedStaleCache = false;

    // Fetch fresh prices for symbols not in cache
    if (symbolsToFetch.length > 0) {
      const assetsToFetch = symbolsToFetch.map((s) => assetMap.get(s)!);

      try {
        const fetchResult = await fetchPricesFromAPIs(assetsToFetch);

        if (fetchResult.prices.length > 0) {
          freshPrices = fetchResult.prices;

          // Update cache with fresh prices (upsert)
          await Promise.all(
            freshPrices.map((price) =>
              prisma.priceCache.upsert({
                where: { symbol: price.symbol },
                create: {
                  symbol: price.symbol,
                  price: price.price,
                  change24h: price.change24h,
                  source: price.source,
                  fetchedAt: price.fetchedAt,
                },
                update: {
                  price: price.price,
                  change24h: price.change24h,
                  source: price.source,
                  fetchedAt: price.fetchedAt,
                },
              })
            )
          );
        }

        // Check if any symbols failed to fetch - use stale cache for those
        const fetchedSymbols = new Set(freshPrices.map((p) => p.symbol));
        const failedSymbols = symbolsToFetch.filter((s) => !fetchedSymbols.has(s));

        if (failedSymbols.length > 0) {
          // Get stale cached prices for failed symbols
          const staleCachedPrices = allCachedPrices.filter(
            (p) => failedSymbols.includes(p.symbol)
          );

          if (staleCachedPrices.length > 0) {
            usedStaleCache = true;
            // Add stale prices as fresh prices (they'll be merged below)
            freshPrices = [
              ...freshPrices,
              ...staleCachedPrices.map((p) => ({
                symbol: p.symbol,
                price: parseFloat(p.price.toString()),
                change24h: p.change24h ? parseFloat(p.change24h.toString()) : null,
                source: `${p.source} (cached)`,
                fetchedAt: p.fetchedAt,
              })),
            ];
          }
        }
      } catch (apiError) {
        // API completely failed - fall back to stale cache for all symbols that needed fetching
        console.error("Price API error, falling back to stale cache:", apiError);

        const staleCachedPrices = allCachedPrices.filter(
          (p) => symbolsToFetch.includes(p.symbol)
        );

        if (staleCachedPrices.length > 0) {
          usedStaleCache = true;
          freshPrices = staleCachedPrices.map((p) => ({
            symbol: p.symbol,
            price: parseFloat(p.price.toString()),
            change24h: p.change24h ? parseFloat(p.change24h.toString()) : null,
            source: `${p.source} (cached)`,
            fetchedAt: p.fetchedAt,
          }));
        }
      }
    }

    // Combine cached and fresh prices
    const allPrices: CachedPrice[] = [
      ...freshCachedPrices.map((p) => ({
        symbol: p.symbol,
        price: p.price.toString(),
        change24h: p.change24h?.toString() ?? null,
        source: p.source,
        fetchedAt: p.fetchedAt,
      })),
      ...freshPrices.map((p) => ({
        symbol: p.symbol,
        price: p.price.toString(),
        change24h: p.change24h?.toString() ?? null,
        source: p.source,
        fetchedAt: p.fetchedAt,
      })),
    ];

    return {
      success: true,
      prices: allPrices,
      fromCache: symbolsToFetch.length === 0,
      usedStaleCache,
    };
  } catch (error) {
    console.error("Error fetching asset prices:", error);
    return { success: false, error: "Failed to fetch prices" };
  }
}

/**
 * Get cached prices without fetching new ones
 */
export async function getCachedPrices(): Promise<FetchAssetPricesResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get unique assets from user's investments
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      select: { asset: { select: { symbol: true } } },
    });

    if (investments.length === 0) {
      return { success: true, prices: [], fromCache: true };
    }

    const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];

    // Get all cached prices (regardless of age)
    const cachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });

    return {
      success: true,
      prices: cachedPrices.map((p) => ({
        symbol: p.symbol,
        price: p.price.toString(),
        change24h: p.change24h?.toString() ?? null,
        source: p.source,
        fetchedAt: p.fetchedAt,
      })),
      fromCache: true,
    };
  } catch (error) {
    console.error("Error getting cached prices:", error);
    return { success: false, error: "Failed to get cached prices" };
  }
}

// ==========================================
// Cache Management Types
// ==========================================

export interface ClearCacheResult {
  success: boolean;
  error?: string;
  clearedCount?: number;
}

export interface PriceCacheStats {
  totalCached: number;
  freshCount: number;
  staleCount: number;
  oldestFetchedAt: Date | null;
  newestFetchedAt: Date | null;
  cacheHitRate: number; // Percentage of symbols that have valid cache
  symbolsCached: string[];
}

export interface GetCacheStatsResult {
  success: boolean;
  error?: string;
  stats?: PriceCacheStats;
}

// ==========================================
// Cache Management Actions
// ==========================================

/**
 * Clear price cache for all symbols in user's portfolio
 * Used when user wants to force a fresh price fetch
 */
export async function clearPriceCache(): Promise<ClearCacheResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get unique assets from user's investments
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      select: { asset: { select: { symbol: true } } },
    });

    if (investments.length === 0) {
      return { success: true, clearedCount: 0 };
    }

    const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];

    // Delete cache entries for these symbols
    const result = await prisma.priceCache.deleteMany({
      where: { symbol: { in: symbols } },
    });

    return {
      success: true,
      clearedCount: result.count,
    };
  } catch (error) {
    console.error("Error clearing price cache:", error);
    return { success: false, error: "Failed to clear price cache" };
  }
}

/**
 * Get cache statistics for monitoring
 * Returns info about cached prices, freshness, and hit rate
 */
export async function getPriceCacheStats(): Promise<GetCacheStatsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get unique assets from user's investments
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      select: { asset: { select: { symbol: true } } },
    });

    if (investments.length === 0) {
      return {
        success: true,
        stats: {
          totalCached: 0,
          freshCount: 0,
          staleCount: 0,
          oldestFetchedAt: null,
          newestFetchedAt: null,
          cacheHitRate: 0,
          symbolsCached: [],
        },
      };
    }

    const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];
    const totalSymbols = symbols.length;

    // Get all cached prices for user's symbols
    const cachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
      orderBy: { fetchedAt: "asc" },
    });

    // Calculate freshness (5 minute TTL)
    const cacheExpiry = new Date(Date.now() - 5 * 60 * 1000);
    const freshCount = cachedPrices.filter((p) => p.fetchedAt >= cacheExpiry).length;
    const staleCount = cachedPrices.length - freshCount;

    // Calculate timestamps
    const oldestFetchedAt = cachedPrices.length > 0 ? cachedPrices[0].fetchedAt : null;
    const newestFetchedAt =
      cachedPrices.length > 0 ? cachedPrices[cachedPrices.length - 1].fetchedAt : null;

    // Calculate cache hit rate (percentage of portfolio symbols that have any cache)
    const cacheHitRate = totalSymbols > 0 ? (cachedPrices.length / totalSymbols) * 100 : 0;

    return {
      success: true,
      stats: {
        totalCached: cachedPrices.length,
        freshCount,
        staleCount,
        oldestFetchedAt,
        newestFetchedAt,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        symbolsCached: cachedPrices.map((p) => p.symbol),
      },
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return { success: false, error: "Failed to get cache stats" };
  }
}
