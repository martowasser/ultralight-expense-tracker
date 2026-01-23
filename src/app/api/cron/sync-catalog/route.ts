import { NextResponse } from "next/server";
import { syncAssetCatalog, getCatalogLastSyncTime } from "@/lib/assetCatalogService";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/sync-catalog
 * Syncs the asset catalog with external sources (Binance for crypto, curated list for stocks/ETFs)
 * Should be called daily (e.g., 4:00 AM UTC) by Vercel cron or external scheduler
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret for security
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

    console.log("Starting asset catalog sync...");

    // Run the sync
    const result = await syncAssetCatalog();

    // Get total counts
    const counts = await prisma.assetCatalog.groupBy({
      by: ["type"],
      _count: { symbol: true },
      where: { isAvailable: true },
    });

    const typeCounts: Record<string, number> = {};
    for (const c of counts) {
      typeCounts[c.type] = c._count.symbol;
    }

    return NextResponse.json({
      success: result.success,
      message: "Asset catalog sync completed",
      stats: {
        crypto: {
          added: result.cryptoAdded,
          updated: result.cryptoUpdated,
          total: typeCounts["CRYPTO"] || 0,
        },
        stocks: {
          added: result.stocksAdded,
          updated: result.stocksUpdated,
          total: typeCounts["STOCK"] || 0,
        },
        etfs: {
          added: result.etfsAdded,
          updated: result.etfsUpdated,
          total: typeCounts["ETF"] || 0,
        },
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in catalog sync cron:", error);
    return NextResponse.json(
      { error: "Failed to sync asset catalog" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-catalog
 * Returns info about the sync endpoint and current catalog status
 */
export async function GET() {
  try {
    const lastSync = await getCatalogLastSyncTime();

    const counts = await prisma.assetCatalog.groupBy({
      by: ["type"],
      _count: { symbol: true },
      where: { isAvailable: true },
    });

    const typeCounts: Record<string, number> = {};
    for (const c of counts) {
      typeCounts[c.type] = c._count.symbol;
    }

    const totalCount = await prisma.assetCatalog.count({
      where: { isAvailable: true },
    });

    return NextResponse.json({
      endpoint: "/api/cron/sync-catalog",
      method: "POST",
      description: "Syncs asset catalog with Binance (crypto) and curated list (stocks/ETFs)",
      security: "Set CRON_SECRET env var and pass as Bearer token in Authorization header",
      schedule: "Recommended: daily at 4:00 AM UTC",
      currentStatus: {
        lastSync: lastSync?.toISOString() || null,
        totalAssets: totalCount,
        byType: {
          crypto: typeCounts["CRYPTO"] || 0,
          stocks: typeCounts["STOCK"] || 0,
          etfs: typeCounts["ETF"] || 0,
        },
      },
      example: {
        vercelCron: '{ "crons": [{ "path": "/api/cron/sync-catalog", "schedule": "0 4 * * *" }] }',
        curl: 'curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/sync-catalog',
      },
    });
  } catch (error) {
    console.error("Error getting catalog status:", error);
    return NextResponse.json(
      { error: "Failed to get catalog status" },
      { status: 500 }
    );
  }
}
