import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssetType, Currency } from "@/generated/prisma/enums";

// Vercel Cron or external scheduler can call this endpoint
// Set up a daily cron job to call POST /api/cron/snapshots
// Example Vercel cron: add to vercel.json: { "crons": [{ "path": "/api/cron/snapshots", "schedule": "0 23 * * *" }] }

interface HoldingSnapshot {
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

/**
 * POST /api/cron/snapshots
 * Captures daily portfolio snapshots for all users with investments
 * Should be called once per day (end of day) by a scheduled job
 *
 * Optionally verify with CRON_SECRET environment variable for security
 */
export async function POST(request: Request) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Get today's date normalized to start of day
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    // Get all users who have at least one investment
    const usersWithInvestments = await prisma.user.findMany({
      where: {
        investments: {
          some: {},
        },
      },
      select: {
        id: true,
      },
    });

    if (usersWithInvestments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users with investments found",
        snapshotsCreated: 0,
        snapshotsSkipped: 0,
      });
    }

    let snapshotsCreated = 0;
    let snapshotsSkipped = 0;
    const errors: string[] = [];

    // Process each user
    for (const user of usersWithInvestments) {
      try {
        // Check if snapshot already exists for this user today
        const existingSnapshot = await prisma.portfolioSnapshot.findFirst({
          where: {
            userId: user.id,
            snapshotDate,
          },
        });

        if (existingSnapshot) {
          snapshotsSkipped++;
          continue;
        }

        // Fetch user's investments with assets
        const investments = await prisma.investment.findMany({
          where: { userId: user.id },
          include: { asset: true },
        });

        if (investments.length === 0) {
          snapshotsSkipped++;
          continue;
        }

        // Get unique symbols
        const symbols = [...new Set(investments.map((inv) => inv.asset.symbol))];

        // Fetch current prices from cache
        const cachedPrices = await prisma.priceCache.findMany({
          where: { symbol: { in: symbols } },
        });

        const priceMap = new Map(
          cachedPrices.map((p) => [p.symbol, parseFloat(p.price.toString())])
        );

        // Aggregate investments by symbol
        const holdingsMap = new Map<
          string,
          {
            symbol: string;
            assetType: AssetType;
            totalQuantity: number;
            totalCost: number;
          }
        >();

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
        let stockValue = 0;

        holdingsMap.forEach((holding) => {
          const currentPrice = priceMap.get(holding.symbol) ?? null;
          const avgPrice = holding.totalCost / holding.totalQuantity;
          const value =
            currentPrice !== null ? holding.totalQuantity * currentPrice : null;
          const gainLoss = value !== null ? value - holding.totalCost : null;
          const gainLossPercent =
            gainLoss !== null && holding.totalCost > 0
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
            gainLossPercent:
              gainLossPercent !== null ? gainLossPercent.toFixed(2) : null,
          });

          if (value !== null) {
            totalValue += value;
            if (holding.assetType === AssetType.CRYPTO) {
              cryptoValue += value;
            } else {
              stockValue += value;
            }
          }

          totalCostBasis += holding.totalCost;
        });

        // Create the snapshot
        await prisma.portfolioSnapshot.create({
          data: {
            userId: user.id,
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

        snapshotsCreated++;
      } catch (userError) {
        console.error(`Error creating snapshot for user ${user.id}:`, userError);
        errors.push(`User ${user.id}: ${String(userError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily snapshots processed",
      snapshotsCreated,
      snapshotsSkipped,
      totalUsers: usersWithInvestments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in daily snapshot cron:", error);
    return NextResponse.json(
      { error: "Failed to process daily snapshots" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/snapshots
 * Returns info about the endpoint for documentation purposes
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/cron/snapshots",
    method: "POST",
    description: "Captures daily portfolio snapshots for all users with investments",
    security: "Set CRON_SECRET env var and pass as Bearer token in Authorization header",
    schedule: "Should be called once per day at end of day (e.g., 23:00 UTC)",
    example: {
      vercelCron: '{ "crons": [{ "path": "/api/cron/snapshots", "schedule": "0 23 * * *" }] }',
    },
  });
}
