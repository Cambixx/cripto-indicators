import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Chart } from "./components/Chart";
import { CoinList } from "./components/CoinList";
import { getTopCryptos, getCryptoChart, subscribeToPrice } from "./lib/api";
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

  useEffect(() => {
    if (selectedCrypto) {
      localStorage.setItem("selectedCrypto", JSON.stringify(selectedCrypto));
    }
  }, [selectedCrypto]);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getTopCryptos();
        setCryptos(data);

        const savedCrypto = localStorage.getItem("selectedCrypto");
        if (savedCrypto) {
          const parsed = JSON.parse(savedCrypto);
          const updated = data.find((c) => c.id === parsed.id);
          if (updated) {
            setSelectedCrypto(updated);
            return;
          }
        }
        if (data.length > 0) {
          setSelectedCrypto(data[0]);
        }
      } catch (err) {
        setError(
          "Error al cargar los datos. Por favor, intenta de nuevo más tarde."
        );
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedCrypto) return;

    const unsubscribe = subscribeToPrice(selectedCrypto.symbol, (update) => {
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

      if (chartData && chartData.length > 0) {
        const newPrice = update.current_price;
        setChartData((prevData) => {
          const lastCandle = [...prevData[prevData.length - 1]];
          lastCandle[4] = newPrice;
          lastCandle[2] = Math.max(lastCandle[2], newPrice);
          lastCandle[3] = Math.min(lastCandle[3], newPrice);
          return [...prevData.slice(0, -1), lastCandle];
        });
      }
    });

    return () => unsubscribe();
  }, [selectedCrypto?.symbol]);

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-4 px-4 md:py-8 md:px-8">
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

      <div
        className={`md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-200 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`fixed right-0 top-[64px] h-[calc(100%-64px)] w-3/4 bg-card shadow-xl transition-transform duration-200 flex flex-col ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute bottom-6 right-6">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
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
          <div className="flex-1 p-4 pb-24 h-full overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}

export default App;
