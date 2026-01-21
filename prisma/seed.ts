import { PrismaClient, AssetType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

// 30 common assets: 10 crypto, 10 ETFs, 10 stocks
const assets = [
  // 10 Cryptocurrencies (precision 6 for higher decimal places)
  { symbol: "BTC", name: "Bitcoin", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "ETH", name: "Ethereum", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "SOL", name: "Solana", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "BNB", name: "Binance Coin", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "XRP", name: "XRP", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "ADA", name: "Cardano", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "DOGE", name: "Dogecoin", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "DOT", name: "Polkadot", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "MATIC", name: "Polygon", type: AssetType.CRYPTO, precision: 6 },
  { symbol: "LINK", name: "Chainlink", type: AssetType.CRYPTO, precision: 6 },

  // 10 ETFs (precision 2 for standard stock decimal places)
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: AssetType.ETF, precision: 2 },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", type: AssetType.ETF, precision: 2 },
  { symbol: "GLD", name: "SPDR Gold Shares", type: AssetType.ETF, precision: 2 },

  // 10 Stocks (precision 2 for standard stock decimal places)
  { symbol: "AAPL", name: "Apple Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "MSFT", name: "Microsoft Corporation", type: AssetType.STOCK, precision: 2 },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: AssetType.STOCK, precision: 2 },
  { symbol: "META", name: "Meta Platforms Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "TSLA", name: "Tesla Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: AssetType.STOCK, precision: 2 },
  { symbol: "V", name: "Visa Inc.", type: AssetType.STOCK, precision: 2 },
  { symbol: "JNJ", name: "Johnson & Johnson", type: AssetType.STOCK, precision: 2 },
];

async function main() {
  console.log("Seeding database with assets...");

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {
        name: asset.name,
        type: asset.type,
        precision: asset.precision,
        isActive: true,
        isGlobal: true,
      },
      create: {
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        precision: asset.precision,
        isActive: true,
        isGlobal: true,
        userId: null,
      },
    });
    console.log(`  Upserted asset: ${asset.symbol} (${asset.name})`);
  }

  console.log(`\nSeeded ${assets.length} assets successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
