import { Currency } from "@/generated/prisma/enums";

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
