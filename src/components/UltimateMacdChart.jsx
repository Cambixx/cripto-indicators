import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { Modal } from "./Modal";

// Importar los sonidos WAV
import alertUpSound from "../assets/sounds/sound-up.wav";
import alertDownSound from "../assets/sounds/sound-down.wav";

// Configuración del indicador
const ULTIMATE_MACD_CONFIG = {
  fastLength: 12,
  slowLength: 26,
  signalLength: 9,
  // Nuevos parámetros
  volumeThreshold: 1.5, // Multiplicador del volumen promedio
  trendStrengthPeriod: 14, // Período para calcular la fuerza de la tendencia
  minHistogramDiff: 0.000001, // Diferencia mínima en el histograma para confirmar señal
  consecutiveBars: 3, // Número de velas consecutivas en la misma dirección
};

import { sendTelegramNotification } from "../services/telegramService";

export function UltimateMacdChart({
  data,
  height = 200,
  title,
  selectedCrypto,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "",
    message: "",
  });

  // Mantener un registro del último cruce mostrado
  const lastShownCrossRef = useRef(null);

  // Referencias para los sonidos WAV
  const upSoundRef = useRef(new Audio(alertUpSound));
  const downSoundRef = useRef(new Audio(alertDownSound));

  // Referencia para almacenar el último rango visible
  const lastVisibleRangeRef = useRef(null);

  // Función para reproducir sonido con manejo específico para móvil
  const playSound = async (isUpCross) => {
    const audio = isUpCross ? upSoundRef.current : downSoundRef.current;

    try {
      // Reiniciar el audio
      audio.currentTime = 0;

      // En móvil, necesitamos cargar el audio primero
      await audio.load();

      // Intentar reproducir con diferentes métodos
      const playAttempt = audio.play();

      if (playAttempt !== undefined) {
        playAttempt.catch((error) => {
          console.warn("Error playing sound:", error);
          // Si falla, intentar con un pequeño retraso
          setTimeout(async () => {
            try {
              // Intentar reproducir de nuevo después de un touch/click
              await audio.play();
            } catch (retryError) {
              console.warn("Retry failed:", retryError);
            }
          }, 100);
        });
      }
    } catch (error) {
      console.warn("Error in playSound:", error);
    }
  };

  // Efecto para preparar los audios
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Crear nuevos elementos de audio
        const upAudio = new Audio(alertUpSound);
        const downAudio = new Audio(alertDownSound);

        // Configurar los elementos
        upAudio.preload = "auto";
        downAudio.preload = "auto";
        upAudio.volume = 0.5;
        downAudio.volume = 0.5;

        // Cargar los audios
        await Promise.all([upAudio.load(), downAudio.load()]);

        // Asignar a las referencias
        upSoundRef.current = upAudio;
        downSoundRef.current = downAudio;
      } catch (error) {
        console.warn("Error setting up audio:", error);
      }
    };

    setupAudio();

    // Cleanup
    return () => {
      if (upSoundRef.current) {
        upSoundRef.current.pause();
        upSoundRef.current = null;
      }
      if (downSoundRef.current) {
        downSoundRef.current.pause();
        downSoundRef.current = null;
      }
    };
  }, []);

  // Función para calcular el volumen promedio
  const calculateAverageVolume = (data, period) => {
    const volumes = data.map((d) => d.volume || 0);
    const sum = volumes.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  };

  // Función para verificar la fuerza de la tendencia
  const checkTrendStrength = (data, index, isUptrend) => {
    if (index < ULTIMATE_MACD_CONFIG.trendStrengthPeriod) return false;

    const prices = data
      .slice(index - ULTIMATE_MACD_CONFIG.trendStrengthPeriod, index + 1)
      .map((d) => d.close);

    let strongTrend = true;
    for (let i = 1; i < prices.length; i++) {
      if (isUptrend) {
        if (prices[i] < prices[i - 1]) strongTrend = false;
      } else {
        if (prices[i] > prices[i - 1]) strongTrend = false;
      }
    }
    return strongTrend;
  };

  // Función para verificar velas consecutivas
  const checkConsecutiveBars = (data, index, isUptrend) => {
    if (index < ULTIMATE_MACD_CONFIG.consecutiveBars) return false;

    const bars = data.slice(
      index - ULTIMATE_MACD_CONFIG.consecutiveBars + 1,
      index + 1
    );
    return bars.every((bar, i) => {
      if (i === 0) return true;
      return isUptrend
        ? bar.close > bars[i - 1].close
        : bar.close < bars[i - 1].close;
    });
  };

  // Función para validar la señal
  const validateSignal = (currentData, index, isUptrend) => {
    // Verificar volumen
    const avgVolume = calculateAverageVolume(
      currentData,
      ULTIMATE_MACD_CONFIG.trendStrengthPeriod
    );
    const currentVolume = currentData[index].volume || 0;
    const hasHighVolume =
      currentVolume > avgVolume * ULTIMATE_MACD_CONFIG.volumeThreshold;

    // Verificar diferencia en el histograma
    const histogramDiff = Math.abs(
      currentData[index].histogram - (currentData[index - 1]?.histogram || 0)
    );
    const hasSignificantMove =
      histogramDiff > ULTIMATE_MACD_CONFIG.minHistogramDiff;

    // Verificar tendencia y velas consecutivas
    const hasTrendStrength = checkTrendStrength(currentData, index, isUptrend);
    const hasConsecutiveBars = checkConsecutiveBars(
      currentData,
      index,
      isUptrend
    );

    // Retornar resultado detallado
    return {
      isValid:
        hasHighVolume &&
        hasSignificantMove &&
        hasTrendStrength &&
        hasConsecutiveBars,
      details: {
        volume: hasHighVolume ? "Alto volumen ✅" : "Bajo volumen ❌",
        movement: hasSignificantMove
          ? "Movimiento significativo ✅"
          : "Movimiento débil ❌",
        trend: hasTrendStrength ? "Tendencia fuerte ✅" : "Tendencia débil ❌",
        consecutive: hasConsecutiveBars
          ? "Velas consecutivas ✅"
          : "Sin confirmación de velas ❌",
      },
    };
  };

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
          top: 0.2,
          bottom: 0.2,
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
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
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

    // Guardar el rango visible actual antes de actualizar el chart
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      lastVisibleRangeRef.current = timeScale.getVisibleRange();
    }

    // Restaurar el último rango visible o establecer el rango por defecto
    if (lastVisibleRangeRef.current) {
      chart.timeScale().setVisibleRange(lastVisibleRangeRef.current);
    } else {
      const isMobile = window.innerWidth < 768;
      const visibleBars = isMobile ? 25 : 80;
      const lastIndex = data.length - 1;
      const firstVisibleIndex = Math.max(0, lastIndex - visibleBars + 1);

      chart.timeScale().setVisibleRange({
        from: data[firstVisibleIndex].time,
        to: data[lastIndex].time,
      });
    }

    // Función para manejar el resize
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    // Verificar cruces y mostrar notificaciones
    const latestCross = data.filter((d) => d.cross).pop();

    if (
      latestCross &&
      lastShownCrossRef.current !==
        `${latestCross.time}-${latestCross.macdAboveSignal}`
    ) {
      const symbol = selectedCrypto?.symbol.toUpperCase() || "Crypto";
      const price = selectedCrypto?.current_price;
      const change24h = selectedCrypto?.price_change_percentage_24h.toFixed(2);

      // Intentar reproducir el sonido con un pequeño retraso para móvil
      setTimeout(() => {
        playSound(latestCross.macdAboveSignal);
      }, 100);

      // Mensaje para el modal y Telegram
      const message = `
${
  latestCross.macdAboveSignal ? "🟢 Señal Alcista" : "🔴 Señal Bajista"
} - ${symbol}

💰 Precio: $${price}
📊 Cambio 24h: ${change24h}%

⚠️ MACD ha cruzado ${
        latestCross.macdAboveSignal ? "por encima" : "por debajo"
      } de la línea de señal

🔍 Detalles de la señal:
${Object.entries(
  validateSignal(data, data.length - 1, latestCross.macdAboveSignal).details
)
  .map(([key, value]) => `- ${value}`)
  .join("\n")}
      `.trim();

      // Mostrar modal
      setModalConfig({
        isOpen: true,
        type: latestCross.macdAboveSignal ? "green" : "red",
        message: message,
      });

      // Enviar notificación a Telegram
      sendTelegramNotification(message);

      lastShownCrossRef.current = `${latestCross.time}-${latestCross.macdAboveSignal}`;
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height, title, selectedCrypto]);

  // Limpiar lastVisibleRangeRef cuando cambia la moneda
  useEffect(() => {
    lastVisibleRangeRef.current = null;
  }, [selectedCrypto?.id]);

  const handleCloseModal = () => {
    // Al cerrar el modal, guardamos el ID del cruce que acabamos de mostrar
    const latestCross = data.filter((d) => d.cross).pop();
    if (latestCross) {
      lastShownCrossRef.current = `${latestCross.time}-${latestCross.macdAboveSignal}`;
    }
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <div className="rounded-xl md:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-md hover:shadow-lg transition-all overflow-hidden">
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

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={handleCloseModal}
        type={modalConfig.type}
        message={modalConfig.message}
      />
    </>
  );
}
