"use client";

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { SubChart } from "./SubChart";
import { UltimateMacdChart } from "./UltimateMacdChart";
import logoCarlos from "../assets/logo-carlos.png";

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
  {
    id: "ultimateMacd",
    name: "Ultimate MACD",
    config: {
      fastLength: 12,
      slowLength: 26,
      signalLength: 9,
    },
  },
];

const COLORS = {
  ma: ["#2962FF", "#2E7D32", "#6200EA", "#FF6D00"],
  ema: ["#1976D2", "#388E3C", "#512DA8", "#E65100"],
  bb: ["#4CAF50", "#90CAF9", "#90CAF9"],
  rsi: "#E91E63",
  macd: ["#2196F3", "#FF5252", "#4CAF50"],
  stoch: ["#FF4081", "#536DFE"],
  ultimateMacd: {
    macdUp: "#00ff00", // lime
    macdDown: "#ff0000", // red
    signal: "#ffff00", // yellow
    histUp: "#00ffff", // aqua
    histUpDim: "#0000ff", // blue
    histDownDim: "#800000", // maroon
    histDown: "#ff0000", // red
  },
};

export function Chart({ data, interval, selectedCrypto }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});

  // Inicializar activeIndicators desde localStorage
  const [activeIndicators, setActiveIndicators] = useState(() => {
    const saved = localStorage.getItem("activeIndicators");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Mapear los IDs guardados a los objetos completos de indicadores
      return INDICATORS.filter((indicator) =>
        parsed.some((savedIndicator) => savedIndicator.id === indicator.id)
      );
    }
    return [];
  });

  const [subChartData, setSubChartData] = useState({
    rsi: null,
    macd: null,
    stoch: null,
    ultimateMacd: null,
  });

  // Formatear los datos una vez y usarlos en todas partes
  const formattedData = data.map((point) => ({
    time: point[0] / 1000,
    open: point[1],
    high: point[2],
    low: point[3],
    close: point[4],
  }));

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

        let avgGain =
          gains.slice(1, rsiPeriod + 1).reduce((a, b) => a + b) / rsiPeriod;
        let avgLoss =
          losses.slice(1, rsiPeriod + 1).reduce((a, b) => a + b) / rsiPeriod;

        return prices
          .map((_, i) => {
            if (i < rsiPeriod) return null;

            if (i > rsiPeriod) {
              avgGain = (avgGain * (rsiPeriod - 1) + gains[i]) / rsiPeriod;
              avgLoss = (avgLoss * (rsiPeriod - 1) + losses[i]) / rsiPeriod;
            }

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            return {
              time: formattedData[i].time,
              value: 100 - 100 / (1 + rs),
            };
          })
          .filter((d) => d !== null);

      case "macd":
        const [fastPeriod, slowPeriod, signalPeriod] = indicator.periods;
        const fastEMA = calculateEMA(prices, fastPeriod);
        const slowEMA = calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signalLine = calculateEMA(macdLine, signalPeriod);

        return prices.map((_, i) => ({
          time: formattedData[i].time,
          macd: macdLine[i],
          signal: signalLine[i],
          histogram: macdLine[i] - signalLine[i],
        }));

      case "stoch":
        const [kPeriod, dPeriod, smooth] = indicator.periods;
        const stochData = [];

        for (let i = kPeriod - 1; i < prices.length; i++) {
          const slice = prices.slice(i - kPeriod + 1, i + 1);
          const high = Math.max(...slice);
          const low = Math.min(...slice);
          const close = prices[i];

          const k = ((close - low) / (high - low)) * 100;
          stochData.push(k);
        }

        const smoothK = calculateSMA(stochData, smooth);
        const smoothD = calculateSMA(smoothK, dPeriod);

        return prices
          .map((_, i) => {
            if (i < kPeriod - 1 + smooth - 1) return null;
            return {
              time: formattedData[i].time,
              k: smoothK[i - (kPeriod - 1)],
              d: smoothD[i - (kPeriod - 1) - (dPeriod - 1)],
            };
          })
          .filter((d) => d !== null);

      case "ultimateMacd":
        const { fastLength, slowLength, signalLength } = indicator.config;

        // Calcular EMAs con nombres diferentes
        const ultFastEMA = calculateEMA(prices, fastLength);
        const ultSlowEMA = calculateEMA(prices, slowLength);

        // Calcular línea MACD
        const ultMacdLine = ultFastEMA.map((fast, i) => fast - ultSlowEMA[i]);

        // Calcular línea de señal
        const ultSignalLine = calculateEMA(ultMacdLine, signalLength);

        // Calcular histograma
        const ultHistogram = ultMacdLine.map(
          (macd, i) => macd - ultSignalLine[i]
        );

        return prices.map((_, i) => {
          const hist = ultHistogram[i];
          const prevHist = ultHistogram[i - 1] || 0;
          const macd = ultMacdLine[i];
          const signal = ultSignalLine[i];

          return {
            time: formattedData[i].time,
            macd,
            signal,
            histogram: hist,
            histState: {
              isUp: hist > prevHist && hist > 0,
              isDown: hist < prevHist && hist > 0,
              isBelowUp: hist > prevHist && hist <= 0,
              isBelowDown: hist < prevHist && hist <= 0,
            },
            macdAboveSignal: macd >= signal,
            cross:
              i > 0 &&
              ((ultMacdLine[i] > ultSignalLine[i] &&
                ultMacdLine[i - 1] <= ultSignalLine[i - 1]) ||
                (ultMacdLine[i] < ultSignalLine[i] &&
                  ultMacdLine[i - 1] >= ultSignalLine[i - 1])),
          };
        });
      default:
        return [];
    }
  };

  // Funciones auxiliares
  const calculateEMA = (data, period) => {
    const multiplier = 2 / (period + 1);
    return data.reduce((ema, price, i) => {
      if (i === 0) return [...ema, price];
      return [...ema, (price - ema[i - 1]) * multiplier + ema[i - 1]];
    }, []);
  };

  const calculateSMA = (data, period) => {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  };

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    const container = chartContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = window.innerWidth < 768 ? 300 : 400;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(container, {
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
      width: containerWidth,
      height: containerHeight,
      timeScale: {
        borderColor: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 10 : 8,
        rightOffset: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        mode: 0,
        alignLabels: true,
        borderVisible: true,
        autoScale: true,
        invertScale: false,
        ticksVisible: false,
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
      handleScale: true,
      handleScroll: true,
    });

    // Serie principal de velas
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        minMove: 0.00000001,
        precision: 8,
      },
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

    // Usar formattedData directamente aquí
    candlestickSeries.setData(formattedData);

    // Procesar indicadores activos
    activeIndicators.forEach((indicator) => {
      const prices = formattedData.map((d) => d.close);

      switch (indicator.id) {
        case "ma":
          indicator.periods.forEach((period, index) => {
            const maData = calculateIndicators(prices, {
              id: "ma",
              periods: [period],
            });
            const lineSeries = chart.addLineSeries({
              color: COLORS.ma[index],
              lineWidth: 1,
              priceFormat: {
                type: "price",
                precision: 8,
              },
            });

            const maLineData = maData
              .map((value, i) => ({
                time: formattedData[i].time,
                value: value[period],
              }))
              .filter((d) => d.value !== undefined);

            lineSeries.setData(maLineData);
            seriesRef.current[`ma_${period}`] = lineSeries;
          });
          break;

        case "ema":
          const emaData = calculateIndicators(prices, {
            id: "ema",
            periods: indicator.periods,
          });
          emaData.forEach((data, index) => {
            const lineSeries = chart.addLineSeries({
              color: COLORS.ema[index],
              lineWidth: 1,
              priceFormat: {
                type: "price",
                precision: 8,
              },
            });

            const emaLineData = data.values.map((value, i) => ({
              time: formattedData[i].time,
              value: value,
            }));

            lineSeries.setData(emaLineData);
            seriesRef.current[`ema_${data.period}`] = lineSeries;
          });
          break;

        case "bb":
          const bbData = calculateIndicators(prices, indicator);
          const bbSeries = {
            middle: chart.addLineSeries({
              color: COLORS.bb[0],
              lineWidth: 1,
              priceFormat: { type: "price", precision: 8 },
            }),
            upper: chart.addLineSeries({
              color: COLORS.bb[1],
              lineWidth: 1,
              priceFormat: { type: "price", precision: 8 },
            }),
            lower: chart.addLineSeries({
              color: COLORS.bb[2],
              lineWidth: 1,
              priceFormat: { type: "price", precision: 8 },
            }),
          };

          const bbLineData = bbData
            .map((value, i) => ({
              time: formattedData[i].time,
              value: value?.middle,
              upper: value?.upper,
              lower: value?.lower,
            }))
            .filter((d) => d.value !== null);

          bbSeries.middle.setData(
            bbLineData.map((d) => ({ time: d.time, value: d.value }))
          );
          bbSeries.upper.setData(
            bbLineData.map((d) => ({ time: d.time, value: d.upper }))
          );
          bbSeries.lower.setData(
            bbLineData.map((d) => ({ time: d.time, value: d.lower }))
          );

          seriesRef.current["bb_middle"] = bbSeries.middle;
          seriesRef.current["bb_upper"] = bbSeries.upper;
          seriesRef.current["bb_lower"] = bbSeries.lower;
          break;
      }
    });

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
      const newWidth = container.clientWidth;
      const newHeight = window.innerWidth < 768 ? 300 : 400;

      chart.applyOptions({
        width: newWidth,
        height: newHeight,
        timeScale: {
          barSpacing: window.innerWidth < 768 ? 10 : 8,
        },
      });

      // Ajustar el rango visible después del resize
      if (data) {
        const visibleBars = window.innerWidth < 768 ? 25 : 80;
        const firstVisibleBar = Math.max(0, formattedData.length - visibleBars);

        chart.timeScale().setVisibleRange({
          from: formattedData[firstVisibleBar].time,
          to: formattedData[formattedData.length - 1].time,
        });
      }
    };

    // Usar ResizeObserver para un mejor manejo del resize
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);

    // Después de crear el chart, ocultar el logo original y agregar el nuestro
    const tvLogo = container.querySelector("#tv-attr-logo");
    if (tvLogo) {
      tvLogo.style.display = "none";
    }

    // Agregar nuestro logo
    const logoContainer = document.createElement("div");
    logoContainer.style.position = "absolute";
    logoContainer.style.right = "5px";
    logoContainer.style.bottom = "5px";
    logoContainer.style.zIndex = "3";

    const logo = document.createElement("img");
    logo.src = logoCarlos;
    logo.style.height = "28px";
    logo.style.width = "auto";
    logo.style.opacity = "0.9";

    logoContainer.appendChild(logo);
    container.appendChild(logoContainer);

    // Agregar listener para cambios de tema
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains("dark");
      chart.applyOptions({
        layout: {
          textColor: isDark ? "#e1e7ef" : "#1f2937",
        },
        grid: {
          vertLines: {
            color: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
          },
          horzLines: {
            color: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(42, 46, 57, 0.1)",
          },
        },
        timeScale: {
          borderColor: isDark
            ? "rgba(42, 46, 57, 0.2)"
            : "rgba(42, 46, 57, 0.1)",
        },
        rightPriceScale: {
          borderColor: isDark
            ? "rgba(42, 46, 57, 0.2)"
            : "rgba(42, 46, 57, 0.1)",
        },
        crosshair: {
          vertLine: {
            color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(42, 46, 57, 0.3)",
            labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
          },
          horzLine: {
            color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(42, 46, 57, 0.3)",
            labelBackgroundColor: isDark ? "#0f1729" : "#ffffff",
          },
        },
      });
    };

    // Observer para detectar cambios en el tema
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      chart.remove();
      if (logoContainer && logoContainer.parentNode) {
        logoContainer.parentNode.removeChild(logoContainer);
      }
    };
  }, [data, activeIndicators]);

  // Efecto para calcular los datos de los subgráficos
  useEffect(() => {
    if (!data || !activeIndicators.length) return;

    const prices = formattedData.map((d) => d.close);
    const newSubChartData = { ...subChartData };

    activeIndicators.forEach((indicator) => {
      switch (indicator.id) {
        case "rsi":
          newSubChartData.rsi = calculateIndicators(prices, indicator);
          break;
        case "macd":
          newSubChartData.macd = calculateIndicators(prices, indicator);
          break;
        case "stoch":
          newSubChartData.stoch = calculateIndicators(prices, indicator);
          break;
        case "ultimateMacd":
          newSubChartData.ultimateMacd = calculateIndicators(prices, indicator);
          break;
      }
    });

    setSubChartData(newSubChartData);
  }, [data, activeIndicators]);

  // Guardar en localStorage cuando cambien los indicadores activos
  useEffect(() => {
    localStorage.setItem("activeIndicators", JSON.stringify(activeIndicators));
  }, [activeIndicators]);

  // Actualizar la función toggleIndicator para mantener toda la configuración
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
        const newIndicators = prev.filter((i) => i.id !== indicator.id);
        localStorage.setItem("activeIndicators", JSON.stringify(newIndicators));
        return newIndicators;
      }
      const newIndicators = [...prev, indicator];
      localStorage.setItem("activeIndicators", JSON.stringify(newIndicators));
      return newIndicators;
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Indicadores */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 md:mx-0 md:px-0">
        <div className="flex gap-1.5 md:gap-2 min-w-max">
          {INDICATORS.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => toggleIndicator(indicator)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium 
                transition-all duration-250 ease-apple hover:scale-[1.02] active:scale-[0.98]
                ${
                  activeIndicators.some((i) => i.id === indicator.id)
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                }
              `}
              style={{ touchAction: "manipulation" }}
            >
              {indicator.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="rounded-xl md:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="p-2 md:p-4">
          <div
            ref={chartContainerRef}
            className="w-full h-[300px] md:h-[400px] relative custom-chart"
            style={{
              "--logo-url": `url(${logoCarlos})`,
            }}
          />
        </div>
      </div>

      {/* Subgráficos */}
      <div className="space-y-4">
        {activeIndicators.map((indicator) => {
          const Component = (() => {
            switch (indicator.id) {
              case "rsi":
                return (
                  subChartData.rsi && (
                    <SubChart
                      key="rsi"
                      data={subChartData.rsi}
                      type="rsi"
                      height={150}
                      title="RSI (14)"
                    />
                  )
                );
              case "macd":
                return (
                  subChartData.macd && (
                    <SubChart
                      key="macd"
                      data={subChartData.macd}
                      type="macd"
                      height={150}
                      title="MACD (12, 26, 9)"
                    />
                  )
                );
              case "stoch":
                return (
                  subChartData.stoch && (
                    <SubChart
                      key="stoch"
                      data={subChartData.stoch}
                      type="stoch"
                      height={150}
                      title="Stochastic (14, 3, 3)"
                    />
                  )
                );
              case "ultimateMacd":
                return (
                  subChartData.ultimateMacd && (
                    <UltimateMacdChart
                      key="ultimateMacd"
                      data={subChartData.ultimateMacd}
                      height={150}
                      title="Ultimate MACD"
                      selectedCrypto={selectedCrypto}
                    />
                  )
                );
              default:
                return null;
            }
          })();

          return (
            Component && (
              <div key={indicator.id} className="animate-slide-in">
                {Component}
              </div>
            )
          );
        })}
      </div>
    </div>
  );
}
