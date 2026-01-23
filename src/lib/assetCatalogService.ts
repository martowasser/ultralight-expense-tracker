/**
 * Asset Catalog Service
 * Fetches and maintains a catalog of available assets from external APIs
 *
 * Sources:
 * - Crypto: Binance API (USDT trading pairs)
 * - Stocks/ETFs: Curated S&P 500 + popular ETFs list + Yahoo Finance validation
 */

import { prisma } from "@/lib/prisma";
import { AssetType } from "@/generated/prisma/enums";
import { CURATED_ASSETS, isCuratedSymbol, getCuratedAsset } from "./curatedAssets";

// ==========================================
// Types
// ==========================================

export interface CatalogAsset {
  symbol: string;
  name: string;
  type: AssetType;
  precision: number;
  source: string;
  sourceId?: string | null;
  isAvailable: boolean;
  lastVerified: Date;
  marketCap?: number | null;
  volume24h?: number | null;
}

export interface SyncResult {
  success: boolean;
  cryptoAdded: number;
  cryptoUpdated: number;
  stocksAdded: number;
  stocksUpdated: number;
  etfsAdded: number;
  etfsUpdated: number;
  errors: string[];
}

// ==========================================
// Binance API Types
// ==========================================

interface BinanceExchangeInfo {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
  }>;
}

interface BinanceTicker {
  symbol: string;
  volume: string;
  quoteVolume: string;
}

// ==========================================
// CoinGecko API Types
// ==========================================

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  market_cap: number | null;
  total_volume: number | null;
}

// ==========================================
// Yahoo Finance API Types
// ==========================================

interface YahooSearchResult {
  quotes: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    quoteType: string;
    exchange: string;
    isYahooFinance: boolean;
  }>;
}

// ==========================================
// Crypto Asset Fetching (Binance)
// ==========================================

/**
 * Fetch all USDT trading pairs from Binance that are currently trading
 * No API key required for public endpoints
 */
export async function fetchBinanceCryptoAssets(): Promise<CatalogAsset[]> {
  const assets: CatalogAsset[] = [];

  try {
    // Fetch exchange info to get all trading pairs
    const response = await fetch("https://api.binance.com/api/v3/exchangeInfo", {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceExchangeInfo = await response.json();
    const now = new Date();

    // Also fetch 24hr ticker to get volume data
    let volumeMap = new Map<string, number>();
    try {
      const tickerResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });

      if (tickerResponse.ok) {
        const tickers: BinanceTicker[] = await tickerResponse.json();
        volumeMap = new Map(
          tickers.map((t) => [t.symbol, parseFloat(t.quoteVolume)])
        );
      }
    } catch {
      console.warn("Failed to fetch Binance volume data, continuing without it");
    }

    // Filter for USDT pairs that are actively trading
    const usdtPairs = data.symbols.filter(
      (s) => s.quoteAsset === "USDT" && s.status === "TRADING"
    );

    for (const pair of usdtPairs) {
      const symbol = pair.baseAsset;
      const volume = volumeMap.get(pair.symbol);

      assets.push({
        symbol: symbol.toUpperCase(),
        name: symbol, // Will be enriched by CoinGecko
        type: "CRYPTO",
        precision: Math.min(pair.baseAssetPrecision, 8), // Cap at 8 decimals
        source: "binance",
        sourceId: null,
        isAvailable: true,
        lastVerified: now,
        marketCap: null, // Will be enriched by CoinGecko
        volume24h: volume ?? null,
      });
    }

    console.log(`Binance: Fetched ${assets.length} crypto assets`);
  } catch (error) {
    console.error("Error fetching Binance assets:", error);
    throw error;
  }

  return assets;
}

// ==========================================
// CoinGecko Metadata Enrichment
// ==========================================

// Common symbol to CoinGecko ID mappings
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "polygon",
  AVAX: "avalanche-2",
  ATOM: "cosmos",
  LTC: "litecoin",
  UNI: "uniswap",
  SHIB: "shiba-inu",
  TRX: "tron",
  XLM: "stellar",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  FIL: "filecoin",
  HBAR: "hedera-hashgraph",
  ICP: "internet-computer",
  VET: "vechain",
  IMX: "immutable-x",
  INJ: "injective-protocol",
  ALGO: "algorand",
  FTM: "fantom",
  AAVE: "aave",
  GRT: "the-graph",
  MKR: "maker",
  QNT: "quant-network",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  CRV: "curve-dao-token",
  SNX: "havven",
  RUNE: "thorchain",
  LDO: "lido-dao",
  FXS: "frax-share",
  PEPE: "pepe",
  FLOKI: "floki",
  BONK: "bonk",
  WIF: "dogwifcoin",
  NOT: "notcoin",
  TON: "the-open-network",
  SUI: "sui",
  SEI: "sei-network",
  TIA: "celestia",
  JUP: "jupiter-exchange-solana",
  STRK: "starknet",
  PYTH: "pyth-network",
  JTO: "jito-governance-token",
  WLD: "worldcoin-org",
  BLUR: "blur",
  RNDR: "render-token",
  FET: "fetch-ai",
  AGIX: "singularitynet",
  OCEAN: "ocean-protocol",
  TAO: "bittensor",
};

/**
 * Fetch market data from CoinGecko to enrich crypto assets with names and market caps
 * Free tier, no API key required (rate limited to 10-30 calls/minute)
 */
export async function fetchCoinGeckoMetadata(): Promise<Map<string, CoinGeckoMarket>> {
  const metadataMap = new Map<string, CoinGeckoMarket>();

  try {
    // Fetch top 250 coins by market cap (covers most popular cryptos)
    // CoinGecko free tier allows this without API key
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.warn(`CoinGecko API returned ${response.status}, skipping enrichment`);
      return metadataMap;
    }

    const coins: CoinGeckoMarket[] = await response.json();

    for (const coin of coins) {
      metadataMap.set(coin.symbol.toUpperCase(), coin);
    }

    console.log(`CoinGecko: Fetched metadata for ${coins.length} coins`);
  } catch (error) {
    console.error("Error fetching CoinGecko metadata:", error);
    // Don't throw - enrichment is optional
  }

  return metadataMap;
}

/**
 * Enrich crypto assets with CoinGecko metadata (names, market caps)
 */
export function enrichCryptoAssets(
  assets: CatalogAsset[],
  coinGeckoData: Map<string, CoinGeckoMarket>
): CatalogAsset[] {
  return assets.map((asset) => {
    const geckoData = coinGeckoData.get(asset.symbol);

    if (geckoData) {
      return {
        ...asset,
        name: geckoData.name,
        sourceId: COINGECKO_ID_MAP[asset.symbol] || geckoData.id,
        marketCap: geckoData.market_cap,
        volume24h: asset.volume24h || geckoData.total_volume,
      };
    }

    // Try to find by CoinGecko ID mapping
    const geckoId = COINGECKO_ID_MAP[asset.symbol];
    if (geckoId) {
      // Search by ID in the data
      for (const [, data] of coinGeckoData) {
        if (data.id === geckoId) {
          return {
            ...asset,
            name: data.name,
            sourceId: geckoId,
            marketCap: data.market_cap,
            volume24h: asset.volume24h || data.total_volume,
          };
        }
      }
    }

    // Keep original if no enrichment found
    return asset;
  });
}

// ==========================================
// Curated Stocks/ETFs
// ==========================================

/**
 * Get all curated stocks and ETFs as CatalogAssets
 */
export function getCuratedStockList(): CatalogAsset[] {
  const now = new Date();

  return CURATED_ASSETS.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    type: asset.type as AssetType,
    precision: 2, // Standard for stocks/ETFs
    source: "curated",
    sourceId: null,
    isAvailable: true,
    lastVerified: now,
    marketCap: null,
    volume24h: null,
  }));
}

// ==========================================
// Stock Symbol Validation (Yahoo Finance)
// ==========================================

/**
 * Validate a stock symbol using Yahoo Finance search API
 * Returns the validated asset if found, null otherwise
 */
export async function validateStockSymbol(
  symbol: string
): Promise<CatalogAsset | null> {
  const normalizedSymbol = symbol.toUpperCase().trim();

  // First check if it's in our curated list
  if (isCuratedSymbol(normalizedSymbol)) {
    const curated = getCuratedAsset(normalizedSymbol);
    if (curated) {
      return {
        symbol: curated.symbol,
        name: curated.name,
        type: curated.type as AssetType,
        precision: 2,
        source: "curated",
        sourceId: null,
        isAvailable: true,
        lastVerified: new Date(),
        marketCap: null,
        volume24h: null,
      };
    }
  }

  // Validate via Yahoo Finance
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedSymbol)}&quotesCount=5&newsCount=0`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.error(`Yahoo Finance search error: ${response.status}`);
      return null;
    }

    const data: YahooSearchResult = await response.json();

    // Find an exact match for the symbol
    const match = data.quotes.find(
      (q) =>
        q.symbol.toUpperCase() === normalizedSymbol &&
        q.isYahooFinance &&
        (q.quoteType === "EQUITY" || q.quoteType === "ETF")
    );

    if (!match) {
      return null;
    }

    const assetType: AssetType = match.quoteType === "ETF" ? "ETF" : "STOCK";

    return {
      symbol: match.symbol.toUpperCase(),
      name: match.longname || match.shortname || match.symbol,
      type: assetType,
      precision: 2,
      source: "yahoo",
      sourceId: null,
      isAvailable: true,
      lastVerified: new Date(),
      marketCap: null,
      volume24h: null,
    };
  } catch (error) {
    console.error(`Error validating symbol ${normalizedSymbol}:`, error);
    return null;
  }
}

/**
 * Validate and add a stock symbol to the catalog
 * Used for on-demand validation of symbols not in the curated list
 */
export async function validateAndAddStock(symbol: string): Promise<{
  success: boolean;
  asset?: CatalogAsset;
  error?: string;
}> {
  const validatedAsset = await validateStockSymbol(symbol);

  if (!validatedAsset) {
    return {
      success: false,
      error: `Symbol "${symbol}" not found or not a valid stock/ETF`,
    };
  }

  try {
    // Upsert to catalog
    await prisma.assetCatalog.upsert({
      where: { symbol: validatedAsset.symbol },
      create: {
        symbol: validatedAsset.symbol,
        name: validatedAsset.name,
        type: validatedAsset.type,
        precision: validatedAsset.precision,
        source: validatedAsset.source,
        sourceId: validatedAsset.sourceId,
        isAvailable: validatedAsset.isAvailable,
        lastVerified: validatedAsset.lastVerified,
        marketCap: validatedAsset.marketCap,
        volume24h: validatedAsset.volume24h,
      },
      update: {
        name: validatedAsset.name,
        isAvailable: true,
        lastVerified: new Date(),
      },
    });

    return {
      success: true,
      asset: validatedAsset,
    };
  } catch (error) {
    console.error(`Error adding validated stock ${symbol}:`, error);
    return {
      success: false,
      error: "Failed to add asset to catalog",
    };
  }
}

// ==========================================
// Main Catalog Sync
// ==========================================

/**
 * Sync the asset catalog with external sources
 * 1. Fetch crypto from Binance
 * 2. Enrich with CoinGecko metadata
 * 3. Load curated stocks/ETFs
 * 4. Upsert all to AssetCatalog
 */
export async function syncAssetCatalog(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    cryptoAdded: 0,
    cryptoUpdated: 0,
    stocksAdded: 0,
    stocksUpdated: 0,
    etfsAdded: 0,
    etfsUpdated: 0,
    errors: [],
  };

  try {
    const now = new Date();

    // 1. Fetch crypto assets from Binance
    let cryptoAssets: CatalogAsset[] = [];
    try {
      cryptoAssets = await fetchBinanceCryptoAssets();
    } catch (error) {
      result.errors.push(`Binance fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // 2. Enrich crypto with CoinGecko metadata
    if (cryptoAssets.length > 0) {
      try {
        const coinGeckoData = await fetchCoinGeckoMetadata();
        cryptoAssets = enrichCryptoAssets(cryptoAssets, coinGeckoData);
      } catch (error) {
        result.errors.push(`CoinGecko enrichment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // 3. Get curated stocks/ETFs
    const stockAssets = getCuratedStockList();

    // 4. Combine all assets
    const allAssets = [...cryptoAssets, ...stockAssets];

    // 5. Upsert to database
    for (const asset of allAssets) {
      try {
        const existing = await prisma.assetCatalog.findUnique({
          where: { symbol: asset.symbol },
        });

        await prisma.assetCatalog.upsert({
          where: { symbol: asset.symbol },
          create: {
            symbol: asset.symbol,
            name: asset.name,
            type: asset.type,
            precision: asset.precision,
            source: asset.source,
            sourceId: asset.sourceId,
            isAvailable: asset.isAvailable,
            lastVerified: now,
            marketCap: asset.marketCap,
            volume24h: asset.volume24h,
          },
          update: {
            name: asset.name,
            type: asset.type,
            precision: asset.precision,
            source: asset.source,
            sourceId: asset.sourceId,
            isAvailable: true,
            lastVerified: now,
            marketCap: asset.marketCap,
            volume24h: asset.volume24h,
          },
        });

        if (existing) {
          if (asset.type === "CRYPTO") result.cryptoUpdated++;
          else if (asset.type === "STOCK") result.stocksUpdated++;
          else if (asset.type === "ETF") result.etfsUpdated++;
        } else {
          if (asset.type === "CRYPTO") result.cryptoAdded++;
          else if (asset.type === "STOCK") result.stocksAdded++;
          else if (asset.type === "ETF") result.etfsAdded++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to upsert ${asset.symbol}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // 6. Mark assets not seen in this sync as unavailable (but don't delete)
    // Get all symbols we just processed
    const processedSymbols = new Set(allAssets.map((a) => a.symbol));

    // Find assets that weren't updated and mark them unavailable
    const staleAssets = await prisma.assetCatalog.findMany({
      where: {
        lastVerified: {
          lt: now,
        },
        isAvailable: true,
      },
      select: { symbol: true },
    });

    for (const stale of staleAssets) {
      if (!processedSymbols.has(stale.symbol)) {
        await prisma.assetCatalog.update({
          where: { symbol: stale.symbol },
          data: { isAvailable: false },
        });
      }
    }

    result.success = true;
    console.log(
      `Catalog sync complete: ${result.cryptoAdded + result.cryptoUpdated} crypto, ` +
        `${result.stocksAdded + result.stocksUpdated} stocks, ${result.etfsAdded + result.etfsUpdated} ETFs`
    );
  } catch (error) {
    console.error("Error syncing asset catalog:", error);
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

// ==========================================
// Catalog Query Functions
// ==========================================

/**
 * Search the asset catalog
 */
export async function searchCatalogAssets(input: {
  search?: string;
  type?: AssetType;
  page?: number;
  limit?: number;
}): Promise<{ assets: CatalogAsset[]; totalCount: number }> {
  const { search, type, page = 1, limit = 100 } = input;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isAvailable: true,
  };

  if (type) {
    where.type = type;
  }

  if (search && search.trim().length > 0) {
    const searchTerm = search.trim();
    where.OR = [
      { symbol: { contains: searchTerm, mode: "insensitive" } },
      { name: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const [assets, totalCount] = await Promise.all([
    prisma.assetCatalog.findMany({
      where,
      orderBy: [
        { marketCap: { sort: "desc", nulls: "last" } },
        { symbol: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.assetCatalog.count({ where }),
  ]);

  return {
    assets: assets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      precision: a.precision,
      source: a.source,
      sourceId: a.sourceId,
      isAvailable: a.isAvailable,
      lastVerified: a.lastVerified,
      marketCap: a.marketCap ? parseFloat(a.marketCap.toString()) : null,
      volume24h: a.volume24h ? parseFloat(a.volume24h.toString()) : null,
    })),
    totalCount,
  };
}

/**
 * Get a single catalog asset by symbol
 */
export async function getCatalogAsset(symbol: string): Promise<CatalogAsset | null> {
  const asset = await prisma.assetCatalog.findUnique({
    where: { symbol: symbol.toUpperCase() },
  });

  if (!asset) return null;

  return {
    symbol: asset.symbol,
    name: asset.name,
    type: asset.type,
    precision: asset.precision,
    source: asset.source,
    sourceId: asset.sourceId,
    isAvailable: asset.isAvailable,
    lastVerified: asset.lastVerified,
    marketCap: asset.marketCap ? parseFloat(asset.marketCap.toString()) : null,
    volume24h: asset.volume24h ? parseFloat(asset.volume24h.toString()) : null,
  };
}

/**
 * Get last sync time for the catalog
 */
export async function getCatalogLastSyncTime(): Promise<Date | null> {
  const latest = await prisma.assetCatalog.findFirst({
    orderBy: { lastVerified: "desc" },
    select: { lastVerified: true },
  });

  return latest?.lastVerified ?? null;
}
