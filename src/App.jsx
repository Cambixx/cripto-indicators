import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { Chart } from "./components/Chart";
import { CoinList } from "./components/CoinList";
import {
  getTopCryptos,
  getCryptoChart,
  subscribeToPrice,
  getCryptoList,
} from "./lib/api";
import "./styles/globals.css";

const INTERVALS = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1d" },
];

function App() {
  const [cryptos, setCryptos] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(() => {
    const saved = localStorage.getItem("selectedCrypto");
    return saved ? JSON.parse(saved) : null;
  });
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState("1h");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Referencia para almacenar el último timestamp recibido
  const lastTimestampRef = useRef(null);

  // Referencia para almacenar la suscripción al precio
  const priceSubscriptionRef = useRef(null);

  useEffect(() => {
    if (selectedCrypto) {
      localStorage.setItem("selectedCrypto", JSON.stringify(selectedCrypto));
    }
  }, [selectedCrypto]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Obtener lista de criptomonedas
        const cryptoList = await getTopCryptos(100);
        setCryptos(cryptoList);

        // Si no hay moneda seleccionada, seleccionar Bitcoin por defecto
        if (!selectedCrypto) {
          const defaultCrypto =
            cryptoList.find((c) => c.symbol === "BTC") || cryptoList[0];
          setSelectedCrypto(defaultCrypto);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Error al cargar los datos. Por favor, intente nuevamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []); // Este efecto solo se ejecuta al montar el componente

  // Efecto separado para manejar la suscripción al precio
  useEffect(() => {
    if (!selectedCrypto?.symbol) return;

    // Cancelar suscripción anterior si existe
    if (priceSubscriptionRef.current) {
      priceSubscriptionRef.current();
    }

    // Crear nueva suscripción
    const unsubscribe = subscribeToPrice(selectedCrypto.symbol, (update) => {
      // Actualizar el listado y el crypto seleccionado
      setCryptos((prevCryptos) =>
        prevCryptos.map((crypto) =>
          crypto.symbol === selectedCrypto.symbol
            ? { ...crypto, ...update }
            : crypto
        )
      );

      setSelectedCrypto((prev) => ({
        ...prev,
        ...update,
      }));

      // Actualizar el gráfico
      if (chartData && chartData.length > 0) {
        const newPrice = update.current_price;
        const currentTime = Date.now();
        const intervalMs = getIntervalInMs(interval);
        const lastCandle = chartData[chartData.length - 1];
        const lastCandleTime = lastCandle[0];

        // Comprobar si necesitamos crear una nueva vela
        if (currentTime >= lastCandleTime + intervalMs) {
          // Crear una nueva vela
          const newCandle = [
            lastCandleTime + intervalMs, // timestamp
            newPrice, // open
            newPrice, // high
            newPrice, // low
            newPrice, // close
          ];

          setChartData((prevData) => [...prevData, newCandle]);
        } else {
          // Actualizar la última vela
          setChartData((prevData) => {
            const lastCandle = [...prevData[prevData.length - 1]];
            lastCandle[4] = newPrice; // close
            lastCandle[2] = Math.max(lastCandle[2], newPrice); // high
            lastCandle[3] = Math.min(lastCandle[3], newPrice); // low
            return [...prevData.slice(0, -1), lastCandle];
          });
        }
      }
    });

    // Guardar la referencia de la suscripción
    priceSubscriptionRef.current = unsubscribe;

    return () => {
      if (priceSubscriptionRef.current) {
        priceSubscriptionRef.current();
      }
    };
  }, [selectedCrypto?.symbol, interval]); // Se ejecuta cuando cambia la moneda seleccionada o el intervalo

  useEffect(() => {
    if (!selectedCrypto) return;

    async function fetchChartData() {
      try {
        setIsChartLoading(true);
        const data = await getCryptoChart(selectedCrypto.id, interval);
        setChartData(data);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsChartLoading(false);
      }
    }

    fetchChartData();
  }, [selectedCrypto?.id, interval]);

  // Función auxiliar para convertir el intervalo a milisegundos
  const getIntervalInMs = (interval) => {
    const value = parseInt(interval.slice(0, -1));
    const unit = interval.slice(-1);
    switch (unit) {
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // 1h por defecto
    }
  };

  // Función para formatear el precio según su magnitud
  const formatPrice = (price) => {
    if (price < 0.00001) return price.toFixed(8);
    if (price < 0.0001) return price.toFixed(7);
    if (price < 0.001) return price.toFixed(6);
    if (price < 0.01) return price.toFixed(5);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toFixed(2);
  };

  // Prevenir el scroll automático cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const preventPullToRefresh = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const startY = touch.screenY;

      const handleTouchMove = (e) => {
        const moveY = e.touches[0].screenY;
        const direction = moveY - startY;

        if (direction > 0 && window.scrollY === 0) {
          e.preventDefault();
        }
      };

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener(
        "touchend",
        () => {
          document.removeEventListener("touchmove", handleTouchMove);
        },
        { once: true }
      );
    };

    document.addEventListener("touchstart", preventPullToRefresh, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchstart", preventPullToRefresh);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container py-4 px-4 md:py-8 md:px-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-1 md:col-span-9 order-1">
            {selectedCrypto && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedCrypto.image}
                        alt={selectedCrypto.name}
                        className="w-8 h-8"
                        onError={(e) => {
                          e.target.src = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`;
                        }}
                      />
                      <h2 className="text-xl md:text-2xl font-bold">
                        {selectedCrypto.name} (
                        {selectedCrypto.symbol.toUpperCase()})
                      </h2>
                    </div>
                    <span className="text-xl md:text-2xl">
                      ${formatPrice(selectedCrypto.current_price)}
                    </span>
                  </div>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="px-3 py-2 bg-card border border-border rounded-lg text-sm w-full sm:w-auto"
                  >
                    {INTERVALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isChartLoading ? (
                  <div className="flex items-center justify-center h-[300px] md:h-[400px] rounded-lg border border-border bg-card">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  chartData && (
                    <Chart
                      data={chartData}
                      interval={interval}
                      selectedCrypto={selectedCrypto}
                    />
                  )
                )}
              </div>
            )}
          </div>
          <div className="hidden md:block md:col-span-3 order-2">
            <div className="bg-card rounded-lg p-4">
              <CoinList
                coins={cryptos}
                selectedCoin={selectedCrypto}
                onSelectCoin={setSelectedCrypto}
                isMobile={false}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Menú móvil */}
      <div
        className={`md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-200 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{ touchAction: "pan-y pinch-zoom" }}
      >
        <div
          className={`fixed right-0 top-[64px] h-[calc(100%-64px)] w-3/4 bg-card shadow-xl transition-transform duration-200 flex flex-col ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y pinch-zoom",
          }}
        >
          <div className="flex-1 p-4 pb-24">
            <CoinList
              coins={cryptos}
              selectedCoin={selectedCrypto}
              onSelectCoin={(coin) => {
                setSelectedCrypto(coin);
                setIsMobileMenuOpen(false);
              }}
              isMobile={true}
            />
          </div>
          <div className="sticky bottom-6 right-6 p-4 bg-card">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Botón flotante para móvil */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-2 shadow-lg z-20 transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src={selectedCrypto?.image}
          alt={selectedCrypto?.name}
          className="w-8 h-8 rounded-full"
          onError={(e) => {
            e.target.src = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`;
          }}
        />
      </button>
    </div>
  );
}

export default App;
