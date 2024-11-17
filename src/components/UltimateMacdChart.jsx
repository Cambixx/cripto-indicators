import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export function UltimateMacdChart({ data, height = 150 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid", color: "#0f1729" },
        textColor: "#e1e7ef",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.6)" },
        horzLines: { color: "rgba(42, 46, 57, 0.6)" },
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
        borderColor: "rgba(42, 46, 57, 0.8)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 10 : 8,
      },
      crosshair: {
        vertLine: {
          color: "rgba(42, 46, 57, 0.8)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#0f1729",
        },
        horzLine: {
          color: "rgba(42, 46, 57, 0.8)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#0f1729",
        },
      },
    });

    // MACD Line
    const macdSeries = chart.addLineSeries({
      color: "#00ff00",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 8 },
    });

    // Signal Line
    const signalSeries = chart.addLineSeries({
      color: "#ffff00",
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
        color: d.macdAboveSignal ? "#00ff00" : "#ff0000",
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
          ? "#00ffff"
          : d.histState.isDown
          ? "#0000ff"
          : d.histState.isBelowDown
          ? "#ff0000"
          : d.histState.isBelowUp
          ? "#800000"
          : "#808080",
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
  }, [data, height]);

  return (
    <div className="rounded-lg border border-border bg-card p-2 sm:p-4 mt-4">
      <div ref={chartContainerRef} />
    </div>
  );
}
