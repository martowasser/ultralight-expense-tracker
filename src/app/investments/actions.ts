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

// ==========================================
// Manual Price Entry Types
// ==========================================

export interface SetManualPriceInput {
  assetId: string;
  price: string;
}

export interface SetManualPriceResult {
  success: boolean;
  error?: string;
  cachedPrice?: CachedPrice;
}

export interface GetCustomAssetsWithPricesResult {
  success: boolean;
  error?: string;
  assets?: Array<Asset & { manualPrice?: CachedPrice }>;
}

// ==========================================
// Manual Price Entry Actions
// ==========================================

/**
 * Set a manual price for a custom asset
 * Only works for custom assets (isGlobal: false) owned by the user
 */
export async function setManualPrice(input: SetManualPriceInput): Promise<SetManualPriceResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { assetId, price } = input;

  if (!assetId) {
    return { success: false, error: "Asset ID is required" };
  }

  if (!price || price.trim() === "") {
    return { success: false, error: "Price is required" };
  }

  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return { success: false, error: "Price must be a non-negative number" };
  }

  try {
    // Verify the asset is a custom asset owned by the user
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        isGlobal: false, // Must be a custom asset
        userId: session.user.id, // Must be owned by the user
      },
    });

    if (!asset) {
      return { success: false, error: "Custom asset not found or not accessible" };
    }

    // Upsert the price in the cache with source "manual"
    const cachedPrice = await prisma.priceCache.upsert({
      where: { symbol: asset.symbol },
      create: {
        symbol: asset.symbol,
        price: priceNum,
        change24h: null, // No 24h change for manual prices
        source: "manual",
        fetchedAt: new Date(),
      },
      update: {
        price: priceNum,
        change24h: null,
        source: "manual",
        fetchedAt: new Date(),
      },
    });

    return {
      success: true,
      cachedPrice: {
        symbol: cachedPrice.symbol,
        price: cachedPrice.price.toString(),
        change24h: cachedPrice.change24h?.toString() ?? null,
        source: cachedPrice.source,
        fetchedAt: cachedPrice.fetchedAt,
      },
    };
  } catch (error) {
    console.error("Error setting manual price:", error);
    return { success: false, error: "Failed to set manual price" };
  }
}

/**
 * Get all custom assets with their manual prices (if any)
 */
export async function getCustomAssetsWithPrices(): Promise<GetCustomAssetsWithPricesResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get user's custom assets
    const customAssets = await prisma.asset.findMany({
      where: {
        userId: session.user.id,
        isGlobal: false,
      },
      orderBy: { symbol: "asc" },
    });

    if (customAssets.length === 0) {
      return { success: true, assets: [] };
    }

    // Get cached prices for these symbols
    const symbols = customAssets.map((a) => a.symbol);
    const cachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });

    const priceMap = new Map(cachedPrices.map((p) => [p.symbol, p]));

    // Combine assets with their prices
    const assetsWithPrices = customAssets.map((asset) => {
      const price = priceMap.get(asset.symbol);
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        precision: asset.precision,
        isActive: asset.isActive,
        isGlobal: asset.isGlobal,
        userId: asset.userId,
        createdAt: asset.createdAt,
        manualPrice: price
          ? {
              symbol: price.symbol,
              price: price.price.toString(),
              change24h: price.change24h?.toString() ?? null,
              source: price.source,
              fetchedAt: price.fetchedAt,
            }
          : undefined,
      };
    });

    return { success: true, assets: assetsWithPrices };
  } catch (error) {
    console.error("Error getting custom assets with prices:", error);
    return { success: false, error: "Failed to get custom assets" };
  }
}

// ==========================================
// Portfolio Snapshot Types
// ==========================================

export interface HoldingSnapshot {
  symbol: string;
  assetType: AssetType;
  quantity: string;
  avgPrice: string;
  currentPrice: string | null;
  value: string | null;
  costBasis: string;
  gainLoss: string | null;
  gainLossPercent: string | null;
}

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  snapshotDate: Date;
  totalValue: string;
  costBasis: string;
  cryptoValue: string;
  stockValue: string;
  holdings: HoldingSnapshot[];
  currency: Currency;
  createdAt: Date;
}

export interface CaptureSnapshotResult {
  success: boolean;
  error?: string;
  snapshot?: PortfolioSnapshot;
  alreadyExists?: boolean;
}

export interface GetSnapshotsInput {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface GetSnapshotsResult {
  success: boolean;
  error?: string;
  snapshots?: PortfolioSnapshot[];
}

// ==========================================
// Portfolio Snapshot Actions
// ==========================================

/**
 * Capture a portfolio snapshot
 * Stores total value, cost basis, crypto value, stock value, and individual holding values
 * Can be triggered manually or by a scheduled job
 */
export async function capturePortfolioSnapshot(forDate?: string): Promise<CaptureSnapshotResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Determine the snapshot date (defaults to today at end of day)
    const snapshotDate = forDate ? new Date(forDate) : new Date();
    // Normalize to start of day to ensure only one snapshot per day
    snapshotDate.setHours(0, 0, 0, 0);

    // Check if a snapshot already exists for this date
    const existingSnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        userId: session.user.id,
        snapshotDate: snapshotDate,
      },
    });

    if (existingSnapshot) {
      // Return existing snapshot info
      const holdings = existingSnapshot.holdings as unknown as HoldingSnapshot[];
      return {
        success: true,
        alreadyExists: true,
        snapshot: {
          id: existingSnapshot.id,
          userId: existingSnapshot.userId,
          snapshotDate: existingSnapshot.snapshotDate,
          totalValue: existingSnapshot.totalValue.toString(),
          costBasis: existingSnapshot.costBasis.toString(),
          cryptoValue: existingSnapshot.cryptoValue.toString(),
          stockValue: existingSnapshot.stockValue.toString(),
          holdings,
          currency: existingSnapshot.currency,
          createdAt: existingSnapshot.createdAt,
        },
      };
    }

    // Fetch all investments with their assets
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { asset: true },
    });

    if (investments.length === 0) {
      // No investments - create empty snapshot
      const snapshot = await prisma.portfolioSnapshot.create({
        data: {
          userId: session.user.id,
          snapshotDate,
          totalValue: 0,
          costBasis: 0,
          cryptoValue: 0,
          stockValue: 0,
          holdings: [],
          currency: Currency.USD,
        },
      });

      return {
        success: true,
        snapshot: {
          id: snapshot.id,
          userId: snapshot.userId,
          snapshotDate: snapshot.snapshotDate,
          totalValue: snapshot.totalValue.toString(),
          costBasis: snapshot.costBasis.toString(),
          cryptoValue: snapshot.cryptoValue.toString(),
          stockValue: snapshot.stockValue.toString(),
          holdings: [],
          currency: snapshot.currency,
          createdAt: snapshot.createdAt,
        },
      };
    }

    // Get unique symbols
    const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];

    // Fetch current prices from cache
    const cachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });

    const priceMap = new Map(cachedPrices.map((p) => [p.symbol, parseFloat(p.price.toString())]));

    // Aggregate investments by symbol (lot tracking)
    const holdingsMap = new Map<string, {
      symbol: string;
      assetType: AssetType;
      totalQuantity: number;
      totalCost: number;
    }>();

    investments.forEach((inv) => {
      const quantity = parseFloat(inv.quantity.toString());
      const price = parseFloat(inv.purchasePrice.toString());
      const cost = quantity * price;

      const existing = holdingsMap.get(inv.asset.symbol);
      if (existing) {
        existing.totalQuantity += quantity;
        existing.totalCost += cost;
      } else {
        holdingsMap.set(inv.asset.symbol, {
          symbol: inv.asset.symbol,
          assetType: inv.asset.type,
          totalQuantity: quantity,
          totalCost: cost,
        });
      }
    });

    // Build holdings array and calculate totals
    const holdings: HoldingSnapshot[] = [];
    let totalValue = 0;
    let totalCostBasis = 0;
    let cryptoValue = 0;
    let stockValue = 0; // Includes both stocks and ETFs

    holdingsMap.forEach((holding) => {
      const currentPrice = priceMap.get(holding.symbol) ?? null;
      const avgPrice = holding.totalCost / holding.totalQuantity;
      const value = currentPrice !== null ? holding.totalQuantity * currentPrice : null;
      const gainLoss = value !== null ? value - holding.totalCost : null;
      const gainLossPercent = gainLoss !== null && holding.totalCost > 0
        ? (gainLoss / holding.totalCost) * 100
        : null;

      holdings.push({
        symbol: holding.symbol,
        assetType: holding.assetType,
        quantity: holding.totalQuantity.toString(),
        avgPrice: avgPrice.toFixed(2),
        currentPrice: currentPrice !== null ? currentPrice.toString() : null,
        value: value !== null ? value.toFixed(2) : null,
        costBasis: holding.totalCost.toFixed(2),
        gainLoss: gainLoss !== null ? gainLoss.toFixed(2) : null,
        gainLossPercent: gainLossPercent !== null ? gainLossPercent.toFixed(2) : null,
      });

      // Accumulate totals (only if we have current prices)
      if (value !== null) {
        totalValue += value;

        if (holding.assetType === AssetType.CRYPTO) {
          cryptoValue += value;
        } else {
          // STOCK and ETF both go into stockValue
          stockValue += value;
        }
      }

      totalCostBasis += holding.totalCost;
    });

    // Create the snapshot
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        userId: session.user.id,
        snapshotDate,
        totalValue,
        costBasis: totalCostBasis,
        cryptoValue,
        stockValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        holdings: holdings as any,
        currency: Currency.USD,
      },
    });

    return {
      success: true,
      snapshot: {
        id: snapshot.id,
        userId: snapshot.userId,
        snapshotDate: snapshot.snapshotDate,
        totalValue: snapshot.totalValue.toString(),
        costBasis: snapshot.costBasis.toString(),
        cryptoValue: snapshot.cryptoValue.toString(),
        stockValue: snapshot.stockValue.toString(),
        holdings,
        currency: snapshot.currency,
        createdAt: snapshot.createdAt,
      },
    };
  } catch (error) {
    console.error("Error capturing portfolio snapshot:", error);
    return { success: false, error: "Failed to capture portfolio snapshot" };
  }
}

/**
 * Get portfolio snapshots for the user
 * Supports filtering by date range and limiting results
 */
export async function getPortfolioSnapshots(input?: GetSnapshotsInput): Promise<GetSnapshotsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { startDate, endDate, limit = 100 } = input || {};

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id };

    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) {
        where.snapshotDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.snapshotDate.lte = new Date(endDate);
      }
    }

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where,
      orderBy: { snapshotDate: "desc" },
      take: Math.min(limit, 1000), // Cap at 1000 for safety
    });

    return {
      success: true,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        userId: s.userId,
        snapshotDate: s.snapshotDate,
        totalValue: s.totalValue.toString(),
        costBasis: s.costBasis.toString(),
        cryptoValue: s.cryptoValue.toString(),
        stockValue: s.stockValue.toString(),
        holdings: s.holdings as unknown as HoldingSnapshot[],
        currency: s.currency,
        createdAt: s.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error getting portfolio snapshots:", error);
    return { success: false, error: "Failed to get portfolio snapshots" };
  }
}

/**
 * Get the latest portfolio snapshot for the user
 */
export async function getLatestSnapshot(): Promise<{ success: boolean; error?: string; snapshot?: PortfolioSnapshot }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { userId: session.user.id },
      orderBy: { snapshotDate: "desc" },
    });

    if (!snapshot) {
      return { success: true, snapshot: undefined };
    }

    return {
      success: true,
      snapshot: {
        id: snapshot.id,
        userId: snapshot.userId,
        snapshotDate: snapshot.snapshotDate,
        totalValue: snapshot.totalValue.toString(),
        costBasis: snapshot.costBasis.toString(),
        cryptoValue: snapshot.cryptoValue.toString(),
        stockValue: snapshot.stockValue.toString(),
        holdings: snapshot.holdings as unknown as HoldingSnapshot[],
        currency: snapshot.currency,
        createdAt: snapshot.createdAt,
      },
    };
  } catch (error) {
    console.error("Error getting latest snapshot:", error);
    return { success: false, error: "Failed to get latest snapshot" };
  }
}

// ==========================================
// Manual Snapshot Types
// ==========================================

export interface CreateManualSnapshotResult {
  success: boolean;
  error?: string;
  snapshot?: PortfolioSnapshot;
  wasUpdated?: boolean;
}

// ==========================================
// Manual Snapshot Action
// ==========================================

/**
 * Create a manual portfolio snapshot
 * If a snapshot already exists for today, it will be updated with current values
 * This action is triggered by the user to capture the current portfolio state
 */
export async function createManualSnapshot(): Promise<CreateManualSnapshotResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Normalize to start of day
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    // Check if a snapshot already exists for today
    const existingSnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        userId: session.user.id,
        snapshotDate: snapshotDate,
      },
    });

    // Fetch all investments with their assets
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { asset: true },
    });

    if (investments.length === 0) {
      // No investments - create or update with empty snapshot
      if (existingSnapshot) {
        const updated = await prisma.portfolioSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            totalValue: 0,
            costBasis: 0,
            cryptoValue: 0,
            stockValue: 0,
            holdings: [],
          },
        });

        return {
          success: true,
          wasUpdated: true,
          snapshot: {
            id: updated.id,
            userId: updated.userId,
            snapshotDate: updated.snapshotDate,
            totalValue: updated.totalValue.toString(),
            costBasis: updated.costBasis.toString(),
            cryptoValue: updated.cryptoValue.toString(),
            stockValue: updated.stockValue.toString(),
            holdings: [],
            currency: updated.currency,
            createdAt: updated.createdAt,
          },
        };
      }

      const snapshot = await prisma.portfolioSnapshot.create({
        data: {
          userId: session.user.id,
          snapshotDate,
          totalValue: 0,
          costBasis: 0,
          cryptoValue: 0,
          stockValue: 0,
          holdings: [],
          currency: Currency.USD,
        },
      });

      return {
        success: true,
        wasUpdated: false,
        snapshot: {
          id: snapshot.id,
          userId: snapshot.userId,
          snapshotDate: snapshot.snapshotDate,
          totalValue: snapshot.totalValue.toString(),
          costBasis: snapshot.costBasis.toString(),
          cryptoValue: snapshot.cryptoValue.toString(),
          stockValue: snapshot.stockValue.toString(),
          holdings: [],
          currency: snapshot.currency,
          createdAt: snapshot.createdAt,
        },
      };
    }

    // Get unique symbols
    const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];

    // Fetch current prices from cache
    const cachedPrices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });

    const priceMap = new Map(cachedPrices.map((p) => [p.symbol, parseFloat(p.price.toString())]));

    // Aggregate investments by symbol (lot tracking)
    const holdingsMap = new Map<string, {
      symbol: string;
      assetType: AssetType;
      totalQuantity: number;
      totalCost: number;
    }>();

    investments.forEach((inv) => {
      const quantity = parseFloat(inv.quantity.toString());
      const price = parseFloat(inv.purchasePrice.toString());
      const cost = quantity * price;

      const existing = holdingsMap.get(inv.asset.symbol);
      if (existing) {
        existing.totalQuantity += quantity;
        existing.totalCost += cost;
      } else {
        holdingsMap.set(inv.asset.symbol, {
          symbol: inv.asset.symbol,
          assetType: inv.asset.type,
          totalQuantity: quantity,
          totalCost: cost,
        });
      }
    });

    // Build holdings array and calculate totals
    const holdings: HoldingSnapshot[] = [];
    let totalValue = 0;
    let totalCostBasis = 0;
    let cryptoValue = 0;
    let stockValue = 0; // Includes both stocks and ETFs

    holdingsMap.forEach((holding) => {
      const currentPrice = priceMap.get(holding.symbol) ?? null;
      const avgPrice = holding.totalCost / holding.totalQuantity;
      const value = currentPrice !== null ? holding.totalQuantity * currentPrice : null;
      const gainLoss = value !== null ? value - holding.totalCost : null;
      const gainLossPercent = gainLoss !== null && holding.totalCost > 0
        ? (gainLoss / holding.totalCost) * 100
        : null;

      holdings.push({
        symbol: holding.symbol,
        assetType: holding.assetType,
        quantity: holding.totalQuantity.toString(),
        avgPrice: avgPrice.toFixed(2),
        currentPrice: currentPrice !== null ? currentPrice.toString() : null,
        value: value !== null ? value.toFixed(2) : null,
        costBasis: holding.totalCost.toFixed(2),
        gainLoss: gainLoss !== null ? gainLoss.toFixed(2) : null,
        gainLossPercent: gainLossPercent !== null ? gainLossPercent.toFixed(2) : null,
      });

      // Accumulate totals (only if we have current prices)
      if (value !== null) {
        totalValue += value;

        if (holding.assetType === AssetType.CRYPTO) {
          cryptoValue += value;
        } else {
          // STOCK and ETF both go into stockValue
          stockValue += value;
        }
      }

      totalCostBasis += holding.totalCost;
    });

    // Update existing or create new snapshot
    if (existingSnapshot) {
      const updated = await prisma.portfolioSnapshot.update({
        where: { id: existingSnapshot.id },
        data: {
          totalValue,
          costBasis: totalCostBasis,
          cryptoValue,
          stockValue,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          holdings: holdings as any,
        },
      });

      return {
        success: true,
        wasUpdated: true,
        snapshot: {
          id: updated.id,
          userId: updated.userId,
          snapshotDate: updated.snapshotDate,
          totalValue: updated.totalValue.toString(),
          costBasis: updated.costBasis.toString(),
          cryptoValue: updated.cryptoValue.toString(),
          stockValue: updated.stockValue.toString(),
          holdings,
          currency: updated.currency,
          createdAt: updated.createdAt,
        },
      };
    }

    // Create the snapshot
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        userId: session.user.id,
        snapshotDate,
        totalValue,
        costBasis: totalCostBasis,
        cryptoValue,
        stockValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        holdings: holdings as any,
        currency: Currency.USD,
      },
    });

    return {
      success: true,
      wasUpdated: false,
      snapshot: {
        id: snapshot.id,
        userId: snapshot.userId,
        snapshotDate: snapshot.snapshotDate,
        totalValue: snapshot.totalValue.toString(),
        costBasis: snapshot.costBasis.toString(),
        cryptoValue: snapshot.cryptoValue.toString(),
        stockValue: snapshot.stockValue.toString(),
        holdings,
        currency: snapshot.currency,
        createdAt: snapshot.createdAt,
      },
    };
  } catch (error) {
    console.error("Error creating manual snapshot:", error);
    return { success: false, error: "Failed to create snapshot" };
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
