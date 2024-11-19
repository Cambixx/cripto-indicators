import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export function UltimateMacdChart({ data, height = 150, title }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid", color: "transparent" },
        textColor: isDark ? "#e1e7ef" : "#1f2937",
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: isDark ? "rgba(42, 46, 57, 0.6)" : "rgba(42, 46, 57, 0.2)",
        },
        horzLines: {
          color: isDark ? "rgba(42, 46, 57, 0.6)" : "rgba(42, 46, 57, 0.2)",
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
      },
      timeScale: {
        borderColor: isDark ? "rgba(42, 46, 57, 0.8)" : "rgba(42, 46, 57, 0.3)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 10 : 8,
      },
      crosshair: {
        vertLine: {
          color: isDark ? "rgba(42, 46, 57, 0.8)" : "rgba(42, 46, 57, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
        },
        horzLine: {
          color: isDark ? "rgba(42, 46, 57, 0.8)" : "rgba(42, 46, 57, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
        },
      },
    });

    // MACD Line
    const macdSeries = chart.addLineSeries({
      color: isDark ? "#00ff00" : "#15803d",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 8 },
    });

    // Signal Line
    const signalSeries = chart.addLineSeries({
      color: isDark ? "#ffff00" : "#ca8a04",
      lineWidth: 1,
      priceFormat: { type: "price", precision: 8 },
    });

    // Histogram
    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: "price", precision: 8 },
    });

    // Puntos de cruce (usando markers en la línea MACD)
    const crossPoints = data.filter((d) => d.cross);
    if (crossPoints.length > 0) {
      const crossSeries = chart.addLineSeries({
        lastPriceAnimation: 0,
        priceFormat: { type: "price", precision: 8 },
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 6,
      });

      crossSeries.setData(
        crossPoints.map((d) => ({
          time: d.time,
          value: d.signal,
          color: d.macdAboveSignal ? "#00ff00" : "#ff0000",
        }))
      );
    }

    // Establecer datos
    macdSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.macd,
        color: d.macdAboveSignal
          ? isDark
            ? "#00ff00"
            : "#15803d"
          : isDark
          ? "#ff0000"
          : "#dc2626",
      }))
    );

    signalSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.signal,
      }))
    );

    histogramSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.histogram,
        color: d.histState.isUp
          ? isDark
            ? "#00ffff"
            : "#0ea5e9"
          : d.histState.isDown
          ? isDark
            ? "#0000ff"
            : "#1d4ed8"
          : d.histState.isBelowDown
          ? isDark
            ? "#ff0000"
            : "#dc2626"
          : d.histState.isBelowUp
          ? isDark
            ? "#800000"
            : "#991b1b"
          : isDark
          ? "#808080"
          : "#6b7280",
      }))
    );

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height, title]);

  return (
    <div className="rounded-xl md:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden transition-all duration-250 ease-apple">
      <div className="px-3 py-2 md:px-4 md:py-3 border-b border-border/40">
        <h3 className="text-xs md:text-sm font-medium text-foreground/90">
          {title}
        </h3>
      </div>
      <div className="p-2 md:p-4">
        <div
          ref={chartContainerRef}
          className="transition-all duration-250 ease-apple"
        />
      </div>
    </div>
  );
}
