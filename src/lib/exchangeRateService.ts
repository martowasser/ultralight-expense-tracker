/**
 * Exchange Rate Service - Fetches currency exchange rates from external APIs
 *
 * Primary API: Frankfurter.app (free, no key required, ECB data)
 * Fallback API: Open Exchange Rates (requires OPEN_EXCHANGE_RATES_API_KEY env var)
 *
 * Supports 8 major currencies: USD, EUR, GBP, JPY, CAD, AUD, CHF, BRL
 */

// Supported currencies for the investments module
// Note: Limited to currencies supported by Frankfurter.app (ECB data)
// CNY and ARS are not supported by ECB
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
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

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch exchange rates from Frankfurter.app (primary API)
 * Free, no API key required, based on European Central Bank data
 */
export async function fetchRatesFromFrankfurter(
  baseCurrency: string = "USD"
): Promise<FetchExchangeRatesResult> {
  const errors: string[] = [];

  // Request all supported currencies except the base
  const targetCurrencies = SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency);
  const symbols = targetCurrencies.join(",");

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${symbols}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 }, // Don't cache this fetch
      }
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data: FrankfurterResponse = await response.json();

    if (!data.rates || Object.keys(data.rates).length === 0) {
      throw new Error("Frankfurter returned no rates");
    }

    // Add the base currency with rate 1
    const rates: Record<string, number> = { ...data.rates };
    rates[baseCurrency] = 1;

    console.log(
      `Frankfurter: Successfully fetched ${Object.keys(rates).length} rates for base ${baseCurrency}`
    );

    return {
      success: true,
      baseCurrency: data.base,
      rates,
      source: "frankfurter",
      fetchedAt: new Date(),
      errors: [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Frankfurter API error:", errorMessage);
    errors.push(`Frankfurter: ${errorMessage}`);

    return {
      success: false,
      baseCurrency,
      rates: {},
      source: "frankfurter",
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
 * Tries Frankfurter.app first, falls back to Open Exchange Rates on failure
 */
export async function fetchExchangeRates(
  baseCurrency: string = "USD"
): Promise<FetchExchangeRatesResult> {
  // Try primary source (Frankfurter.app) first
  console.log(
    `Fetching exchange rates from Frankfurter for base ${baseCurrency}`
  );
  const primaryResult = await fetchRatesFromFrankfurter(baseCurrency);

  if (primaryResult.success && Object.keys(primaryResult.rates).length > 0) {
    return primaryResult;
  }

  // Primary failed, try fallback (Open Exchange Rates)
  console.log(
    `Frankfurter failed, trying Open Exchange Rates fallback`
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
