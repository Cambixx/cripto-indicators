import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export function SubChart({ data, type, height = 150, title }) {
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
        fontFamily: "Inter, -apple-system, system-ui, sans-serif",
      },
      grid: {
        vertLines: {
          color: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
        },
        horzLines: {
          color: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 10 : 8,
      },
      crosshair: {
        vertLine: {
          color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(42, 46, 57, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
        },
        horzLine: {
          color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(42, 46, 57, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
        },
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    switch (type) {
      case "rsi":
        const rsiSeries = chart.addLineSeries({
          color: isDark ? "#E91E63" : "#be185d",
          lineWidth: 1,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
        });

        // Líneas de sobrecompra/sobreventa
        const overBought = chart.addLineSeries({
          color: isDark ? "rgba(255, 82, 82, 0.5)" : "rgba(239, 68, 68, 0.4)",
          lineWidth: 1,
          lineStyle: 2,
        });
        const overSold = chart.addLineSeries({
          color: isDark ? "rgba(76, 175, 80, 0.5)" : "rgba(34, 197, 94, 0.4)",
          lineWidth: 1,
          lineStyle: 2,
        });

        overBought.setData(data.map((d) => ({ time: d.time, value: 70 })));
        overSold.setData(data.map((d) => ({ time: d.time, value: 30 })));
        rsiSeries.setData(data);
        break;

      case "macd":
        const macdLineSeries = chart.addLineSeries({
          color: isDark ? "#2196F3" : "#1d4ed8",
          lineWidth: 1,
          priceFormat: { type: "price", precision: 6 },
        });
        const signalLineSeries = chart.addLineSeries({
          color: isDark ? "#FF5252" : "#dc2626",
          lineWidth: 1,
          priceFormat: { type: "price", precision: 6 },
        });
        const histogramSeries = chart.addHistogramSeries({
          color: isDark ? "#4CAF50" : "#15803d",
          priceFormat: { type: "price", precision: 6 },
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
            color:
              d.histogram >= 0
                ? isDark
                  ? "#4CAF50"
                  : "#15803d"
                : isDark
                ? "#FF5252"
                : "#dc2626",
          }))
        );
        break;

      case "stoch":
        const kSeries = chart.addLineSeries({
          color: isDark ? "#FF4081" : "#db2777",
          lineWidth: 1,
          priceFormat: { type: "price", precision: 2 },
        });
        const dSeries = chart.addLineSeries({
          color: isDark ? "#536DFE" : "#4f46e5",
          lineWidth: 1,
          priceFormat: { type: "price", precision: 2 },
        });

        const stochOverBought = chart.addLineSeries({
          color: isDark ? "rgba(255, 82, 82, 0.5)" : "rgba(239, 68, 68, 0.4)",
          lineWidth: 1,
          lineStyle: 2,
        });
        const stochOverSold = chart.addLineSeries({
          color: isDark ? "rgba(76, 175, 80, 0.5)" : "rgba(34, 197, 94, 0.4)",
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

    // Solo establecer el rango visible en la carga inicial
    if (!chartRef.current) {
      const isMobile = window.innerWidth < 768;
      const visibleBars = isMobile ? 25 : 80;
      const lastIndex = data.length - 1;
      const firstVisibleIndex = Math.max(0, lastIndex - visibleBars + 1);

      chart.timeScale().setVisibleRange({
        from: data[firstVisibleIndex].time,
        to: data[lastIndex].time,
      });
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
