/**
 * Price Service - Fetches asset prices from external APIs
 *
 * Crypto: Binance API (primary), CoinGecko (fallback)
 * Stocks/ETFs: Yahoo Finance API (primary), Alpha Vantage (fallback)
 */

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number | null;
  source: string;
  fetchedAt: Date;
}

export interface FetchPricesResult {
  success: boolean;
  prices: PriceData[];
  errors: string[];
}

// Symbol mappings for Binance (crypto symbols need USDT suffix)
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  SOL: "SOLUSDT",
  ADA: "ADAUSDT",
  XRP: "XRPUSDT",
  DOT: "DOTUSDT",
  DOGE: "DOGEUSDT",
  LINK: "LINKUSDT",
  MATIC: "MATICUSDT",
};

interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

/**
 * Fetch crypto prices from Binance API
 */
export async function fetchCryptoPricesFromBinance(
  symbols: string[]
): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  const results: PriceData[] = [];
  const errors: string[] = [];

  // Map symbols to Binance format
  const binanceSymbols = symbols.map(
    (s) => BINANCE_SYMBOL_MAP[s.toUpperCase()] || `${s.toUpperCase()}USDT`
  );

  try {
    // Fetch 24hr ticker for all symbols at once
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(binanceSymbols)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 }, // Don't cache this fetch
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceTickerResponse[] = await response.json();
    const now = new Date();

    // Map response back to original symbols
    for (const ticker of data) {
      // Find original symbol from binance symbol
      const originalSymbol = symbols.find((s) => {
        const binanceSymbol =
          BINANCE_SYMBOL_MAP[s.toUpperCase()] || `${s.toUpperCase()}USDT`;
        return binanceSymbol === ticker.symbol;
      });

      if (originalSymbol) {
        results.push({
          symbol: originalSymbol.toUpperCase(),
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          source: "binance",
          fetchedAt: now,
        });
      }
    }
  } catch (error) {
    console.error("Binance API error:", error);
    errors.push(
      `Binance: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return results;
}

// Symbol mappings for CoinGecko (uses full coin names as IDs)
const COINGECKO_SYMBOL_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  DOGE: "dogecoin",
  LINK: "chainlink",
  MATIC: "matic-network",
};

interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

/**
 * Fetch crypto prices from CoinGecko API (fallback)
 */
export async function fetchCryptoPricesFromCoinGecko(
  symbols: string[]
): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  const results: PriceData[] = [];

  // Map symbols to CoinGecko IDs
  const coinGeckoIds = symbols
    .map((s) => COINGECKO_SYMBOL_MAP[s.toUpperCase()])
    .filter(Boolean);

  if (coinGeckoIds.length === 0) {
    console.warn("CoinGecko: No known symbol mappings for requested symbols");
    return results;
  }

  try {
    // CoinGecko markets endpoint supports multiple IDs
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinGeckoIds.join(",")}&price_change_percentage=24h`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoMarketResponse[] = await response.json();
    const now = new Date();

    // Map response back to original symbols
    for (const coin of data) {
      // Find original symbol from CoinGecko ID
      const originalSymbol = Object.entries(COINGECKO_SYMBOL_MAP).find(
        ([, geckoId]) => geckoId === coin.id
      )?.[0];

      if (originalSymbol && symbols.map((s) => s.toUpperCase()).includes(originalSymbol)) {
        results.push({
          symbol: originalSymbol.toUpperCase(),
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          source: "coingecko",
          fetchedAt: now,
        });
      }
    }

    console.log(`CoinGecko: Successfully fetched ${results.length} prices`);
  } catch (error) {
    console.error("CoinGecko API error:", error);
  }

  return results;
}

interface YahooQuoteResponse {
  quoteResponse: {
    result: Array<{
      symbol: string;
      regularMarketPrice: number;
      regularMarketChangePercent: number;
    }>;
    error: null | { code: string; description: string };
  };
}

/**
 * Fetch stock/ETF prices from Yahoo Finance API
 */
export async function fetchStockPricesFromYahoo(
  symbols: string[]
): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  const results: PriceData[] = [];

  try {
    // Yahoo Finance uses the direct symbol
    const symbolsParam = symbols.map((s) => s.toUpperCase()).join(",");

    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data: YahooQuoteResponse = await response.json();
    const now = new Date();

    if (data.quoteResponse.error) {
      throw new Error(data.quoteResponse.error.description);
    }

    for (const quote of data.quoteResponse.result) {
      results.push({
        symbol: quote.symbol.toUpperCase(),
        price: quote.regularMarketPrice,
        change24h: quote.regularMarketChangePercent,
        source: "yahoo",
        fetchedAt: now,
      });
    }
  } catch (error) {
    console.error("Yahoo Finance API error:", error);
    // Don't throw - return empty results and let caller handle
  }

  return results;
}

interface AlphaVantageQuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "10. change percent": string;
  };
}

/**
 * Fetch stock/ETF prices from Alpha Vantage API (fallback)
 * Note: Alpha Vantage free tier allows 25 requests/day, so we fetch one at a time
 */
export async function fetchStockPricesFromAlphaVantage(
  symbols: string[]
): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  const results: PriceData[] = [];
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || "demo";

  // Alpha Vantage requires one request per symbol
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${apiKey}`,
        {
          headers: { Accept: "application/json" },
          next: { revalidate: 0 },
        }
      );

      if (!response.ok) {
        console.error(`Alpha Vantage API error for ${symbol}: ${response.status}`);
        continue;
      }

      const data: AlphaVantageQuoteResponse = await response.json();
      const now = new Date();

      // Check if we got a valid response (API returns empty object on error/limit)
      if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
        const quote = data["Global Quote"];
        const changePercent = parseFloat(quote["10. change percent"].replace("%", ""));

        results.push({
          symbol: symbol.toUpperCase(),
          price: parseFloat(quote["05. price"]),
          change24h: isNaN(changePercent) ? null : changePercent,
          source: "alphavantage",
          fetchedAt: now,
        });
      } else {
        console.warn(`Alpha Vantage: No data returned for ${symbol}`);
      }
    } catch (error) {
      console.error(`Alpha Vantage API error for ${symbol}:`, error);
    }
  }

  if (results.length > 0) {
    console.log(`Alpha Vantage: Successfully fetched ${results.length} prices`);
  }

  return results;
}

/**
 * Fetch crypto prices with automatic failover from Binance to CoinGecko
 */
async function fetchCryptoPricesWithFallback(
  symbols: string[]
): Promise<{ prices: PriceData[]; errors: string[] }> {
  if (symbols.length === 0) return { prices: [], errors: [] };

  const errors: string[] = [];

  // Try primary source (Binance) first
  console.log(`Fetching crypto prices from Binance for: ${symbols.join(", ")}`);
  let prices = await fetchCryptoPricesFromBinance(symbols);

  // Check which symbols failed to fetch
  const fetchedSymbols = new Set(prices.map((p) => p.symbol.toUpperCase()));
  const failedSymbols = symbols.filter(
    (s) => !fetchedSymbols.has(s.toUpperCase())
  );

  // If some symbols failed, try fallback (CoinGecko)
  if (failedSymbols.length > 0) {
    console.log(
      `Binance: Missing ${failedSymbols.length} symbols, trying CoinGecko fallback`
    );
    errors.push(`Binance: Failed to fetch ${failedSymbols.join(", ")}`);

    const fallbackPrices = await fetchCryptoPricesFromCoinGecko(failedSymbols);

    if (fallbackPrices.length > 0) {
      console.log(
        `CoinGecko fallback: Successfully fetched ${fallbackPrices.length} prices`
      );
      prices = [...prices, ...fallbackPrices];
    } else {
      errors.push(`CoinGecko fallback: Failed to fetch ${failedSymbols.join(", ")}`);
    }
  }

  return { prices, errors };
}

/**
 * Fetch stock/ETF prices with automatic failover from Yahoo to Alpha Vantage
 */
async function fetchStockPricesWithFallback(
  symbols: string[]
): Promise<{ prices: PriceData[]; errors: string[] }> {
  if (symbols.length === 0) return { prices: [], errors: [] };

  const errors: string[] = [];

  // Try primary source (Yahoo Finance) first
  console.log(`Fetching stock prices from Yahoo Finance for: ${symbols.join(", ")}`);
  let prices = await fetchStockPricesFromYahoo(symbols);

  // Check which symbols failed to fetch
  const fetchedSymbols = new Set(prices.map((p) => p.symbol.toUpperCase()));
  const failedSymbols = symbols.filter(
    (s) => !fetchedSymbols.has(s.toUpperCase())
  );

  // If some symbols failed, try fallback (Alpha Vantage)
  if (failedSymbols.length > 0) {
    console.log(
      `Yahoo Finance: Missing ${failedSymbols.length} symbols, trying Alpha Vantage fallback`
    );
    errors.push(`Yahoo Finance: Failed to fetch ${failedSymbols.join(", ")}`);

    const fallbackPrices = await fetchStockPricesFromAlphaVantage(failedSymbols);

    if (fallbackPrices.length > 0) {
      console.log(
        `Alpha Vantage fallback: Successfully fetched ${fallbackPrices.length} prices`
      );
      prices = [...prices, ...fallbackPrices];
    } else {
      errors.push(`Alpha Vantage fallback: Failed to fetch ${failedSymbols.join(", ")}`);
    }
  }

  return { prices, errors };
}

/**
 * Fetch prices for multiple assets, routing to appropriate API based on asset type
 * Includes automatic failover: Binance -> CoinGecko for crypto, Yahoo -> Alpha Vantage for stocks
 */
export async function fetchPrices(
  assets: Array<{ symbol: string; type: "CRYPTO" | "STOCK" | "ETF" }>
): Promise<FetchPricesResult> {
  const cryptoSymbols = assets
    .filter((a) => a.type === "CRYPTO")
    .map((a) => a.symbol);
  const stockSymbols = assets
    .filter((a) => a.type === "STOCK" || a.type === "ETF")
    .map((a) => a.symbol);

  const allErrors: string[] = [];
  let allPrices: PriceData[] = [];

  // Fetch crypto and stock prices in parallel with fallback support
  const [cryptoResult, stockResult] = await Promise.all([
    fetchCryptoPricesWithFallback(cryptoSymbols).catch((err) => {
      console.error("Crypto fetch completely failed:", err);
      allErrors.push(`Crypto fetch failed: ${err.message}`);
      return { prices: [] as PriceData[], errors: [] as string[] };
    }),
    fetchStockPricesWithFallback(stockSymbols).catch((err) => {
      console.error("Stock fetch completely failed:", err);
      allErrors.push(`Stock fetch failed: ${err.message}`);
      return { prices: [] as PriceData[], errors: [] as string[] };
    }),
  ]);

  allPrices = [...cryptoResult.prices, ...stockResult.prices];
  allErrors.push(...cryptoResult.errors, ...stockResult.errors);

  // Log results for monitoring
  console.log(`Price fetch complete: ${allPrices.length} prices fetched`);
  if (allErrors.length > 0) {
    console.warn(`Price fetch errors:`, allErrors);
  }

  return {
    success: allPrices.length > 0,
    prices: allPrices,
    errors: allErrors,
  };
}
