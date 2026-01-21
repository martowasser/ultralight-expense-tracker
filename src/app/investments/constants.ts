import { Currency, DividendType } from "@/generated/prisma/enums";

// Currency display info (symbol and name)
export const CURRENCY_INFO: Record<string, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  CAD: { name: "Canadian Dollar", symbol: "C$" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  CHF: { name: "Swiss Franc", symbol: "Fr" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  BRL: { name: "Brazilian Real", symbol: "R$" },
};

// Common platforms for dropdown
export const PLATFORMS = [
  "Binance",
  "Coinbase",
  "Kraken",
  "Robinhood",
  "Fidelity",
  "Charles Schwab",
  "TD Ameritrade",
  "E*TRADE",
  "Interactive Brokers",
  "Vanguard",
  "Other",
] as const;

// Currencies supported for investments
export const CURRENCIES: Currency[] = [
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
];

// Dividend types for dropdown
export const DIVIDEND_TYPES: { value: DividendType; label: string }[] = [
  { value: "REGULAR", label: "Regular" },
  { value: "SPECIAL", label: "Special" },
  { value: "CAPITAL_GAIN", label: "Capital Gain" },
];
