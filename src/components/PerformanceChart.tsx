"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PortfolioSnapshot } from "@/app/investments/actions";

type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  value: number;
  costBasis: number;
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  dataKey: string;
  payload: ChartDataPoint;
}

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "ALL", label: "All", days: Infinity },
];

export default function PerformanceChart({ snapshots }: PerformanceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1M");
  const [activeTooltip, setActiveTooltip] = useState<ChartDataPoint | null>(null);

  // Filter and format snapshots based on selected time range
  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];

    // Sort snapshots by date ascending
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    // Filter by time range
    const rangeConfig = TIME_RANGES.find((r) => r.key === selectedRange);
    const cutoffDate = rangeConfig?.days === Infinity
      ? new Date(0)
      : new Date(Date.now() - rangeConfig!.days * 24 * 60 * 60 * 1000);

    const filtered = sorted.filter(
      (s) => new Date(s.snapshotDate).getTime() >= cutoffDate.getTime()
    );

    // Format for chart
    return filtered.map((s) => {
      const date = new Date(s.snapshotDate);
      return {
        date: date.toISOString().split("T")[0],
        dateLabel: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: sorted.length > 365 ? "2-digit" : undefined,
        }),
        value: parseFloat(s.totalValue),
        costBasis: parseFloat(s.costBasis),
      };
    });
  }, [snapshots, selectedRange]);

  // Calculate period return
  const periodReturn = useMemo(() => {
    if (chartData.length < 2) return null;

    const startValue = chartData[0].value;
    const endValue = chartData[chartData.length - 1].value;
    const change = endValue - startValue;
    const percentChange = startValue > 0 ? (change / startValue) * 100 : 0;

    return {
      startValue,
      endValue,
      change,
      percentChange,
    };
  }, [chartData]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-[#e5e5e5] px-3 py-2 shadow-sm">
          <p className="text-xs text-[#737373] mb-1">{data.dateLabel}</p>
          <p className="text-sm font-medium text-[#171717]">
            {formatCurrencyDetailed(data.value)}
          </p>
          <p className="text-xs text-[#a3a3a3]">
            Cost basis: {formatCurrencyDetailed(data.costBasis)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (snapshots.length === 0) {
    return (
      <div className="py-8 text-center border border-[#e5e5e5] bg-[#fafafa]">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#e5e5e5] mb-3">
          <svg className="w-5 h-5 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <p className="text-sm text-[#737373]">no data for chart</p>
        <p className="text-xs text-[#a3a3a3] mt-1">create snapshots to see performance over time</p>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="py-8 text-center border border-[#e5e5e5] bg-[#fafafa]">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#e5e5e5] mb-3">
          <svg className="w-5 h-5 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <p className="text-sm text-[#737373]">need at least 2 snapshots</p>
        <p className="text-xs text-[#a3a3a3] mt-1">
          {selectedRange !== "ALL" ? "try selecting a longer time range or " : ""}
          create more snapshots to see the chart
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.key}
              onClick={() => setSelectedRange(range.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedRange === range.key
                  ? "bg-[#171717] text-white"
                  : "bg-[#f5f5f5] text-[#737373] hover:bg-[#e5e5e5]"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Return Summary */}
      {periodReturn && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-3 bg-[#f5f5f5]">
          <div>
            <p className="text-xs text-[#a3a3a3]">start</p>
            <p className="text-sm font-medium text-[#171717]">
              {formatCurrencyDetailed(periodReturn.startValue)}
            </p>
          </div>
          <div className="hidden sm:block text-[#e5e5e5]">→</div>
          <div>
            <p className="text-xs text-[#a3a3a3]">end</p>
            <p className="text-sm font-medium text-[#171717]">
              {formatCurrencyDetailed(periodReturn.endValue)}
            </p>
          </div>
          <div className="sm:ml-auto">
            <p className="text-xs text-[#a3a3a3]">period return</p>
            <p className={`text-sm font-medium ${
              periodReturn.change >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {periodReturn.change >= 0 ? "+" : ""}
              {formatCurrencyDetailed(periodReturn.change)} ({periodReturn.percentChange >= 0 ? "+" : ""}
              {periodReturn.percentChange.toFixed(2)}%)
            </p>
          </div>
        </div>
      )}

      {/* Tooltip display for touch devices */}
      {activeTooltip && (
        <div className="sm:hidden p-3 bg-[#f5f5f5] border border-[#e5e5e5]">
          <p className="text-xs text-[#737373]">{activeTooltip.dateLabel}</p>
          <p className="text-sm font-medium text-[#171717]">
            {formatCurrencyDetailed(activeTooltip.value)}
          </p>
          <p className="text-xs text-[#a3a3a3]">
            Cost basis: {formatCurrencyDetailed(activeTooltip.costBasis)}
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            onMouseMove={(state) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const activePayload = (state as any)?.activePayload;
              if (activePayload?.[0]?.payload) {
                setActiveTooltip(activePayload[0].payload as ChartDataPoint);
              }
            }}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#171717"
              strokeWidth={2}
              dot={chartData.length <= 30}
              activeDot={{ r: 4, fill: "#171717" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data points count */}
      <p className="text-xs text-[#a3a3a3] text-center">
        {chartData.length} data point{chartData.length !== 1 ? "s" : ""} in selected range
      </p>
    </div>
  );
}
