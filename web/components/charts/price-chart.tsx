"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import type { MarketDataPoint } from "@/lib/api";

interface PriceChartProps {
  data: MarketDataPoint[];
  height?: number;
}

export function PriceChart({ data, height = 300 }: PriceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // Cleanup previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
    }

    const chart = createChart(chartRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.5)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(0,184,124,0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(0,184,124,0.3)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00b87c",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#00b87c",
      wickDownColor: "#ef4444",
      wickUpColor: "#00b87c",
    });

    const chartData = data.map((d) => ({
      time: d.ts.split("T")[0],
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(chartData as any);

    // Add volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.ts.split("T")[0],
        value: d.volume,
        color: d.close >= d.open ? "rgba(0,184,124,0.2)" : "rgba(239,68,68,0.2)",
      })) as any
    );

    // Add MA20 line if available
    const ma20Data = data
      .filter((d) => d.ma20 != null)
      .map((d) => ({ time: d.ts.split("T")[0], value: d.ma20! }));
    if (ma20Data.length > 0) {
      const ma20Series = chart.addSeries(LineSeries, {
        color: "rgba(0,184,124,0.5)",
        lineWidth: 1,
        priceLineVisible: false,
      });
      ma20Series.setData(ma20Data as any);
    }

    // Add MA50 line if available
    const ma50Data = data
      .filter((d) => d.ma50 != null)
      .map((d) => ({ time: d.ts.split("T")[0], value: d.ma50! }));
    if (ma50Data.length > 0) {
      const ma50Series = chart.addSeries(LineSeries, {
        color: "rgba(14,165,233,0.5)",
        lineWidth: 1,
        priceLineVisible: false,
      });
      ma50Series.setData(ma50Data as any);
    }

    chart.timeScale().fitContent();
    chartInstanceRef.current = chart;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        className="rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return <div ref={chartRef} className="w-full rounded-lg overflow-hidden" />;
}
