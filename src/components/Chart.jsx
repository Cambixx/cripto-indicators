"use client";

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

const INDICATORS = [
  { id: "ma", name: "Media Móvil (MA)", periods: [9, 20, 50, 200] },
  {
    id: "ema",
    name: "Media Móvil Exponencial (EMA)",
    periods: [9, 20, 50, 200],
  },
  { id: "bb", name: "Bandas de Bollinger", period: 20, stdDev: 2 },
  { id: "rsi", name: "RSI", period: 14 },
  { id: "macd", name: "MACD", periods: [12, 26, 9] },
  { id: "stoch", name: "Estocástico", periods: [14, 3, 3] },
];

const COLORS = {
  ma: ["#2962FF", "#2E7D32", "#6200EA", "#FF6D00"],
  ema: ["#1976D2", "#388E3C", "#512DA8", "#E65100"],
  bb: ["#4CAF50", "#90CAF9", "#90CAF9"],
  rsi: "#E91E63",
  macd: ["#2196F3", "#FF5252", "#4CAF50"],
  stoch: ["#FF4081", "#536DFE"],
};

export function Chart({ data, interval }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [activeIndicators, setActiveIndicators] = useState([]);

  // Función para calcular indicadores
  const calculateIndicators = (prices, indicator) => {
    switch (indicator.id) {
      case "ma":
        return prices.map((price, index) => {
          const values = {};
          indicator.periods.forEach((period) => {
            if (index >= period - 1) {
              const slice = prices.slice(index - period + 1, index + 1);
              values[period] = slice.reduce((a, b) => a + b) / period;
            }
          });
          return values;
        });
      case "ema":
        const emaData = [];
        indicator.periods.forEach((period) => {
          const multiplier = 2 / (period + 1);
          const emaValues = prices.reduce((acc, price, index) => {
            if (index === 0) {
              acc.push(price);
            } else {
              acc.push((price - acc[index - 1]) * multiplier + acc[index - 1]);
            }
            return acc;
          }, []);
          emaData.push({ period, values: emaValues });
        });
        return emaData;
      case "bb":
        const period = indicator.period;
        const stdDev = indicator.stdDev;
        return prices.map((_, index) => {
          if (index < period - 1) return null;
          const slice = prices.slice(index - period + 1, index + 1);
          const sma = slice.reduce((a, b) => a + b) / period;
          const variance =
            slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
          const std = Math.sqrt(variance);
          return {
            middle: sma,
            upper: sma + stdDev * std,
            lower: sma - stdDev * std,
          };
        });
      case "rsi":
        const rsiPeriod = indicator.period;
        let gains = [0],
          losses = [0];

        for (let i = 1; i < prices.length; i++) {
          const difference = prices[i] - prices[i - 1];
          gains.push(difference > 0 ? difference : 0);
          losses.push(difference < 0 ? -difference : 0);
        }

        const calculateRS = (index) => {
          if (index < rsiPeriod) return null;
          const avgGain =
            gains
              .slice(index - rsiPeriod + 1, index + 1)
              .reduce((a, b) => a + b) / rsiPeriod;
          const avgLoss =
            losses
              .slice(index - rsiPeriod + 1, index + 1)
              .reduce((a, b) => a + b) / rsiPeriod;
          return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        };

        return prices.map((_, index) => calculateRS(index));
      default:
        return [];
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    // Obtener el precio mínimo y máximo para ajustar la escala
    const prices = data.flatMap((candle) => [
      candle[1],
      candle[2],
      candle[3],
      candle[4],
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Determinar la precisión basada en el precio mínimo
    let precision;
    if (minPrice < 0.00001) precision = 8;
    else if (minPrice < 0.0001) precision = 7;
    else if (minPrice < 0.001) precision = 6;
    else if (minPrice < 0.01) precision = 5;
    else if (minPrice < 1) precision = 4;
    else if (minPrice < 10) precision = 3;
    else precision = 2;

    // Crear el chart con la configuración actualizada
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
      height: window.innerWidth < 768 ? 300 : 400,
      timeScale: {
        borderColor: "rgba(42, 46, 57, 0.8)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 10 : 8,
        rightOffset: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: "rgba(42, 46, 57, 0.8)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        mode: 0,
        precision: precision,
        autoScale: true,
        alignLabels: true,
        borderVisible: true,
        entireTextOnly: true,
        ticksVisible: true,
        format: "{price}",
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
      localization: {
        priceFormatter: (price) => `$${price.toFixed(precision)}`,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    // Serie principal de velas con la configuración actualizada
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        precision: precision,
        minMove: Math.pow(10, -precision),
        formatter: (price) => `$${price.toFixed(precision)}`,
      },
      // Asegurar que la serie use el mismo rango de precios
      autoscaleInfoProvider: () => ({
        priceRange: {
          minValue: minPrice,
          maxValue: maxPrice,
        },
      }),
    });

    // Limpiar series anteriores de manera segura
    Object.entries(seriesRef.current).forEach(([key, series]) => {
      if (series && typeof series.remove === "function") {
        try {
          series.remove();
        } catch (error) {
          console.warn(`Error removing series ${key}:`, error);
        }
      }
    });
    seriesRef.current = {};

    // Establecer datos de velas
    const formattedData = data.map((point) => ({
      time: point[0] / 1000,
      open: point[1],
      high: point[2],
      low: point[3],
      close: point[4],
    }));

    candlestickSeries.setData(formattedData);

    // Ajustar el número de velas visibles según el dispositivo
    const isMobile = window.innerWidth < 768;
    const visibleBars = isMobile ? 25 : 80;
    const barSpacing = isMobile ? 10 : 8;
    const rightOffset = 5;

    chart.applyOptions({
      timeScale: {
        barSpacing: barSpacing,
        rightOffset: rightOffset,
      },
    });

    // Calcular el rango visible
    const lastIndex = formattedData.length - 1;
    const firstVisibleIndex = Math.max(0, lastIndex - visibleBars + 1);

    chart.timeScale().setVisibleRange({
      from: formattedData[firstVisibleIndex].time,
      to: formattedData[lastIndex].time,
    });

    // Función para manejar el resize
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const visibleBars = isMobile ? 25 : 80;
      const barSpacing = isMobile ? 10 : 8;

      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: window.innerWidth < 768 ? 300 : 400,
        timeScale: {
          barSpacing: barSpacing,
          rightOffset: rightOffset,
        },
      });

      const lastIndex = formattedData.length - 1;
      const firstVisibleIndex = Math.max(0, lastIndex - visibleBars + 1);

      chart.timeScale().setVisibleRange({
        from: formattedData[firstVisibleIndex].time,
        to: formattedData[lastIndex].time,
      });
    };

    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
      Object.entries(seriesRef.current).forEach(([key, series]) => {
        if (series && typeof series.remove === "function") {
          try {
            series.remove();
          } catch (error) {
            console.warn(`Error removing series ${key} during cleanup:`, error);
          }
        }
      });
      if (chart && typeof chart.remove === "function") {
        chart.remove();
      }
    };
  }, [data, activeIndicators]);

  // Manejar cambios de indicadores de manera más segura
  const toggleIndicator = (indicator) => {
    setActiveIndicators((prev) => {
      const isActive = prev.some((i) => i.id === indicator.id);
      if (isActive) {
        // Limpiar series específicas del indicador de manera segura
        Object.entries(seriesRef.current).forEach(([key, series]) => {
          if (
            key.startsWith(indicator.id) &&
            series &&
            typeof series.remove === "function"
          ) {
            try {
              series.remove();
              delete seriesRef.current[key];
            } catch (error) {
              console.warn(`Error removing ${key}:`, error);
            }
          }
        });
        return prev.filter((i) => i.id !== indicator.id);
      }
      return [...prev, indicator];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {INDICATORS.map((indicator) => (
          <button
            key={indicator.id}
            onClick={() => toggleIndicator(indicator)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              activeIndicators.some((i) => i.id === indicator.id)
                ? "bg-primary text-primary-foreground"
                : "bg-accent hover:bg-accent/80"
            }`}
          >
            {indicator.name}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-2 sm:p-4">
        <div
          ref={chartContainerRef}
          className="w-full min-h-[300px] md:min-h-[400px]"
        />
      </div>
    </div>
  );
}
