/**
 * Exchange Rate Service - Fetches currency exchange rates from external APIs
 *
 * Primary API: ExchangeRate.host (free, no key required)
 * Fallback API: Open Exchange Rates (requires OPEN_EXCHANGE_RATES_API_KEY env var)
 *
 * Supports 10 major currencies: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, ARS, BRL
 */

// Supported currencies for the investments module
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "ARS",
  "BRL",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}

export interface ExchangeRateMap {
  [targetCurrency: string]: number;
}

export interface FetchExchangeRatesResult {
  success: boolean;
  baseCurrency: string;
  rates: ExchangeRateMap;
  source: string;
  fetchedAt: Date;
  errors: string[];
}

interface ExchangeRateHostResponse {
  success: boolean;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch exchange rates from ExchangeRate.host (primary API)
 * Free tier, no API key required, supports all major currencies
 */
export async function fetchRatesFromExchangeRateHost(
  baseCurrency: string = "USD"
): Promise<FetchExchangeRatesResult> {
  const errors: string[] = [];
  const symbols = SUPPORTED_CURRENCIES.join(",");

  try {
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=${baseCurrency}&symbols=${symbols}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 }, // Don't cache this fetch
      }
    );

    if (!response.ok) {
      throw new Error(`ExchangeRate.host API error: ${response.status}`);
    }

    const data: ExchangeRateHostResponse = await response.json();

    if (!data.success) {
      throw new Error("ExchangeRate.host returned success: false");
    }

    console.log(
      `ExchangeRate.host: Successfully fetched ${Object.keys(data.rates).length} rates for base ${baseCurrency}`
    );

    return {
      success: true,
      baseCurrency: data.base,
      rates: data.rates,
      source: "exchangerate.host",
      fetchedAt: new Date(),
      errors: [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("ExchangeRate.host API error:", errorMessage);
    errors.push(`ExchangeRate.host: ${errorMessage}`);

    return {
      success: false,
      baseCurrency,
      rates: {},
      source: "exchangerate.host",
      fetchedAt: new Date(),
      errors,
    };
  }
}

interface OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

/**
 * Fetch exchange rates from Open Exchange Rates (fallback API)
 * Requires OPEN_EXCHANGE_RATES_API_KEY environment variable
 * Free tier allows 1000 requests/month with USD base only
 */
export async function fetchRatesFromOpenExchangeRates(
  baseCurrency: string = "USD"
): Promise<FetchExchangeRatesResult> {
  const errors: string[] = [];
  const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;

  if (!apiKey) {
    console.warn(
      "Open Exchange Rates: No API key configured (OPEN_EXCHANGE_RATES_API_KEY)"
    );
    return {
      success: false,
      baseCurrency,
      rates: {},
      source: "openexchangerates",
      fetchedAt: new Date(),
      errors: ["No API key configured for Open Exchange Rates"],
    };
  }

  try {
    // Open Exchange Rates free tier only supports USD base
    // For other base currencies, we fetch USD rates and convert
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      throw new Error(`Open Exchange Rates API error: ${response.status}`);
    }

    const data: OpenExchangeRatesResponse = await response.json();
    let rates = data.rates;

    // If base currency is not USD, convert rates
    if (baseCurrency !== "USD") {
      const baseRate = data.rates[baseCurrency];
      if (!baseRate) {
        throw new Error(
          `Base currency ${baseCurrency} not found in response`
        );
      }
      // Convert all rates to be relative to the requested base currency
      rates = Object.fromEntries(
        Object.entries(data.rates).map(([currency, rate]) => [
          currency,
          rate / baseRate,
        ])
      );
    }

    // Filter to only supported currencies
    const filteredRates: ExchangeRateMap = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      if (rates[currency] !== undefined) {
        filteredRates[currency] = rates[currency];
      }
    }

    console.log(
      `Open Exchange Rates: Successfully fetched ${Object.keys(filteredRates).length} rates for base ${baseCurrency}`
    );

    return {
      success: true,
      baseCurrency,
      rates: filteredRates,
      source: "openexchangerates",
      fetchedAt: new Date(),
      errors: [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Open Exchange Rates API error:", errorMessage);
    errors.push(`Open Exchange Rates: ${errorMessage}`);

    return {
      success: false,
      baseCurrency,
      rates: {},
      source: "openexchangerates",
      fetchedAt: new Date(),
      errors,
    };
  }
}

/**
 * Fetch exchange rates with automatic failover
 * Tries ExchangeRate.host first, falls back to Open Exchange Rates on failure
 */
export async function fetchExchangeRates(
  baseCurrency: string = "USD"
): Promise<FetchExchangeRatesResult> {
  // Try primary source (ExchangeRate.host) first
  console.log(
    `Fetching exchange rates from ExchangeRate.host for base ${baseCurrency}`
  );
  const primaryResult = await fetchRatesFromExchangeRateHost(baseCurrency);

  if (primaryResult.success && Object.keys(primaryResult.rates).length > 0) {
    return primaryResult;
  }

  // Primary failed, try fallback (Open Exchange Rates)
  console.log(
    `ExchangeRate.host failed, trying Open Exchange Rates fallback`
  );
  const fallbackResult =
    await fetchRatesFromOpenExchangeRates(baseCurrency);

  if (fallbackResult.success && Object.keys(fallbackResult.rates).length > 0) {
    // Mark as fallback source
    return {
      ...fallbackResult,
      source: "openexchangerates (fallback)",
      errors: [...primaryResult.errors, ...fallbackResult.errors],
    };
  }

  // Both failed
  console.error("All exchange rate APIs failed");
  return {
    success: false,
    baseCurrency,
    rates: {},
    source: "none",
    fetchedAt: new Date(),
    errors: [...primaryResult.errors, ...fallbackResult.errors],
  };
}

/**
 * Convert an amount from one currency to another using the provided rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap,
  baseCurrency: string
): number | null {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // If rates are based on USD
  if (baseCurrency === "USD") {
    const fromRate = fromCurrency === "USD" ? 1 : rates[fromCurrency];
    const toRate = toCurrency === "USD" ? 1 : rates[toCurrency];

    if (fromRate === undefined || toRate === undefined) {
      return null;
    }

    // Convert: amount in fromCurrency -> USD -> toCurrency
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
  }

  // Generic case: rates are relative to baseCurrency
  const fromRate = fromCurrency === baseCurrency ? 1 : rates[fromCurrency];
  const toRate = toCurrency === baseCurrency ? 1 : rates[toCurrency];

  if (fromRate === undefined || toRate === undefined) {
    return null;
  }

  // Convert through base currency
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}
