import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export function SubChart({ data, type, height = 150 }) {
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

    switch (type) {
      case "rsi":
        const rsiSeries = chart.addLineSeries({
          color: "#E91E63",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
        });

        // Agregar líneas de sobrecompra/sobreventa
        const overBought = chart.addLineSeries({
          color: "rgba(255, 82, 82, 0.5)",
          lineWidth: 1,
          lineStyle: 2,
        });
        const overSold = chart.addLineSeries({
          color: "rgba(76, 175, 80, 0.5)",
          lineWidth: 1,
          lineStyle: 2,
        });

        overBought.setData(data.map((d) => ({ time: d.time, value: 70 })));
        overSold.setData(data.map((d) => ({ time: d.time, value: 30 })));
        rsiSeries.setData(data);
        break;

      case "macd":
        const macdLineSeries = chart.addLineSeries({
          color: "#2196F3",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 6,
          },
        });
        const signalLineSeries = chart.addLineSeries({
          color: "#FF5252",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 6,
          },
        });
        const histogramSeries = chart.addHistogramSeries({
          color: "#4CAF50",
          priceFormat: {
            type: "price",
            precision: 6,
          },
        });

        macdLineSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.macd,
          }))
        );
        signalLineSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.signal,
          }))
        );
        histogramSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.histogram,
            color: d.histogram >= 0 ? "#4CAF50" : "#FF5252",
          }))
        );
        break;

      case "stoch":
        const kSeries = chart.addLineSeries({
          color: "#FF4081",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 2,
          },
        });
        const dSeries = chart.addLineSeries({
          color: "#536DFE",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 2,
          },
        });

        // Agregar líneas de sobrecompra/sobreventa
        const stochOverBought = chart.addLineSeries({
          color: "rgba(255, 82, 82, 0.5)",
          lineWidth: 1,
          lineStyle: 2,
        });
        const stochOverSold = chart.addLineSeries({
          color: "rgba(76, 175, 80, 0.5)",
          lineWidth: 1,
          lineStyle: 2,
        });

        stochOverBought.setData(data.map((d) => ({ time: d.time, value: 80 })));
        stochOverSold.setData(data.map((d) => ({ time: d.time, value: 20 })));
        kSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.k,
          }))
        );
        dSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.d,
          }))
        );
        break;
    }

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
  }, [data, type, height]);

  return (
    <div className="rounded-lg border border-border bg-card p-2 sm:p-4 mt-4">
      <div ref={chartContainerRef} />
    </div>
  );
}
