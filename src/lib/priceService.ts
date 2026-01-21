/**
 * Price Service - Fetches asset prices from external APIs
 *
 * Crypto: Binance API (primary)
 * Stocks/ETFs: Yahoo Finance API (primary)
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

/**
 * Fetch prices for multiple assets, routing to appropriate API based on asset type
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

  const errors: string[] = [];
  let allPrices: PriceData[] = [];

  // Fetch crypto and stock prices in parallel
  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPricesFromBinance(cryptoSymbols).catch((err) => {
      errors.push(`Crypto fetch failed: ${err.message}`);
      return [] as PriceData[];
    }),
    fetchStockPricesFromYahoo(stockSymbols).catch((err) => {
      errors.push(`Stock fetch failed: ${err.message}`);
      return [] as PriceData[];
    }),
  ]);

  allPrices = [...cryptoPrices, ...stockPrices];

  return {
    success: allPrices.length > 0,
    prices: allPrices,
    errors,
  };
}
