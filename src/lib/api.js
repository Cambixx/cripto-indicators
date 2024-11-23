import axios from "axios";

const BINANCE_API = "https://api.binance.com/api/v3";

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

const CRYPTO_NAMES = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "Binance Coin",
  SOL: "Solana",
  XRP: "Ripple",
  ADA: "Cardano",
  AVAX: "Avalanche",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  MATIC: "Polygon",
};

// Crear un mapa para las suscripciones
const subscriptions = new Map();

// Función auxiliar para esperar un tiempo
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Función para crear una conexión WebSocket con reintentos
async function createWebSocket(key, onUpdate) {
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 1000;

  while (retryCount < maxRetries) {
    try {
      const ws = new WebSocket("wss://stream.binance.com:9443/ws");

      // Promesa para manejar la conexión
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
          ws.close();
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log(`WebSocket connected for ${key}`);

          const subscribeMsg = {
            method: "SUBSCRIBE",
            params: [`${key}usdt@ticker`],
            id: Date.now(),
          };
          ws.send(JSON.stringify(subscribeMsg));
          resolve(ws);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.warn(`WebSocket error for ${key}:`, error);
          reject(error);
        };
      });

      // Configurar los manejadores de eventos después de una conexión exitosa
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === "24hrTicker") {
            const price = Number(data.c);
            const priceChange = Number(data.p);
            const priceChangePercent = Number(data.P);
            const volume = Number(data.v) * price;

            const update = {
              current_price: price,
              price_change_24h: priceChange,
              price_change_percentage_24h: priceChangePercent,
              total_volume: volume,
            };

            // Verificar si la suscripción aún existe antes de notificar
            const subscription = subscriptions.get(key);
            if (subscription && subscription.callbacks) {
              subscription.callbacks.forEach((callback) => {
                callback(update);
              });
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      ws.onclose = async (event) => {
        console.log(`WebSocket closed for ${key} with code ${event.code}`);
        const subscription = subscriptions.get(key);
        if (subscription && subscription.callbacks.size > 0) {
          await delay(Math.min(1000 * Math.pow(2, retryCount), 30000));
          subscription.ws = null;
          createWebSocket(key, onUpdate);
        }
      };

      return ws;
    } catch (error) {
      retryCount++;
      console.warn(
        `Connection attempt ${retryCount} failed for ${key}:`,
        error
      );
      await delay(baseDelay * Math.pow(2, retryCount));
    }
  }

  throw new Error(`Failed to connect after ${maxRetries} attempts`);
}

export function subscribeToPrice(symbol, onUpdate) {
  const key = symbol.toLowerCase();

  if (subscriptions.has(key)) {
    const subscription = subscriptions.get(key);
    subscription.callbacks.add(onUpdate);

    // Si el WebSocket está cerrado, intentar reconectar
    if (!subscription.ws || subscription.ws.readyState !== WebSocket.OPEN) {
      createWebSocket(key, onUpdate)
        .then((ws) => {
          subscription.ws = ws;
        })
        .catch((error) => {
          console.error(`Failed to reconnect WebSocket for ${key}:`, error);
        });
    }
  } else {
    subscriptions.set(key, {
      callbacks: new Set([onUpdate]),
      ws: null,
    });

    createWebSocket(key, onUpdate)
      .then((ws) => {
        const subscription = subscriptions.get(key);
        if (subscription) {
          subscription.ws = ws;
        }
      })
      .catch((error) => {
        console.error(`Failed to create WebSocket for ${key}:`, error);
      });
  }

  return () => {
    const subscription = subscriptions.get(key);
    if (subscription) {
      subscription.callbacks.delete(onUpdate);
      if (subscription.callbacks.size === 0) {
        if (subscription.ws) {
          subscription.ws.close(1000, "Subscription ended");
        }
        subscriptions.delete(key);
      }
    }
  };
}

// Función para actualizar el gráfico periódicamente
export function startChartUpdates(coinId, interval, onUpdate) {
  let timeoutId = null;
  let isRunning = true;

  async function updateChart() {
    if (!isRunning) return;

    try {
      const data = await getCryptoChart(coinId, interval);
      if (isRunning) {
        onUpdate(data);
        timeoutId = setTimeout(updateChart, 10000);
      }
    } catch (error) {
      console.error("Error updating chart:", error);
      if (isRunning) {
        timeoutId = setTimeout(updateChart, 10000);
      }
    }
  }

  // Iniciar las actualizaciones
  updateChart();

  // Retornar función para detener las actualizaciones
  return () => {
    isRunning = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

export async function getTopCryptos(limit = 20) {
  try {
    const [tickerResponse, exchangeInfo, bookTickers] = await Promise.all([
      axiosInstance.get(`${BINANCE_API}/ticker/24hr`),
      axiosInstance.get(`${BINANCE_API}/exchangeInfo`),
      axiosInstance.get(`${BINANCE_API}/ticker/bookTicker`),
    ]);

    const bookPrices = {};
    bookTickers.data.forEach((ticker) => {
      if (ticker.symbol.endsWith("USDT")) {
        bookPrices[ticker.symbol] = {
          price: (Number(ticker.bidPrice) + Number(ticker.askPrice)) / 2,
        };
      }
    });

    const symbolInfo = {};
    exchangeInfo.data.symbols.forEach((symbol) => {
      if (symbol.symbol.endsWith("USDT")) {
        symbolInfo[symbol.symbol] = {
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          filters: symbol.filters,
        };
      }
    });

    const usdtPairs = tickerResponse.data
      .filter((ticker) => ticker.symbol.endsWith("USDT"))
      .map((ticker) => {
        const baseAsset =
          symbolInfo[ticker.symbol]?.baseAsset ||
          ticker.symbol.replace("USDT", "");

        const currentPrice =
          bookPrices[ticker.symbol]?.price || Number(ticker.lastPrice);
        const volume = Number(ticker.volume);
        const quoteVolume = Number(ticker.quoteVolume);
        const priceChange = Number(ticker.priceChange);
        const priceChangePercent = Number(ticker.priceChangePercent);
        const highPrice = Number(ticker.highPrice);
        const lowPrice = Number(ticker.lowPrice);

        return {
          id: baseAsset.toLowerCase(),
          symbol: baseAsset,
          name: CRYPTO_NAMES[baseAsset] || baseAsset,
          current_price: currentPrice,
          image: `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${baseAsset.toLowerCase()}.png`,
          price_change_percentage_24h: priceChangePercent,
          total_volume: volume * currentPrice,
          price_change_24h: priceChange,
        };
      })
      .filter((pair) => !isNaN(pair.current_price) && pair.current_price > 0)
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, limit);

    return usdtPairs;
  } catch (error) {
    console.error("Error fetching top cryptos:", error.message);
    throw error;
  }
}

export async function getCryptoChart(coinId, interval = "1h") {
  try {
    let limit;
    switch (interval) {
      case "1m":
        limit = 500;
        break;
      case "5m":
        limit = 288;
        break;
      case "15m":
        limit = 192;
        break;
      case "1h":
        limit = 168;
        break;
      case "4h":
        limit = 180;
        break;
      case "1d":
        limit = 90;
        break;
      default:
        limit = 168;
    }

    const symbol = `${coinId.toUpperCase()}USDT`;

    // Obtener primero los datos del listado para tener el precio exacto
    const topCryptos = await getTopCryptos();
    const currentCrypto = topCryptos.find((crypto) => crypto.id === coinId);

    if (!currentCrypto) {
      throw new Error("Cryptocurrency not found");
    }

    // Obtener datos históricos
    const response = await axiosInstance.get(`${BINANCE_API}/klines`, {
      params: {
        symbol: symbol,
        interval: interval,
        limit: limit,
      },
    });

    // Formatear los datos históricos usando el precio exacto del listado
    const formattedData = response.data
      .map((candle) => {
        const [timestamp, open, high, low, close] = candle;

        // Verificar si es la última vela
        const isLastCandle =
          Number(timestamp) ===
          Math.max(...response.data.map((c) => Number(c[0])));

        // Si es la última vela, usar el precio del listado
        const closePrice = isLastCandle
          ? currentCrypto.current_price
          : Number(close);

        return [
          Number(timestamp),
          Number(open),
          Number(high),
          Number(low),
          closePrice,
        ];
      })
      .filter((candle) => !candle.some(isNaN));

    return formattedData;
  } catch (error) {
    console.error("Error fetching crypto chart data:", error.message);
    throw error;
  }
}

// Función para obtener la lista de criptomonedas
export async function getCryptoList() {
  try {
    // Usar getTopCryptos en lugar de CoinGecko
    const cryptos = await getTopCryptos(100);
    return cryptos.map((crypto) => ({
      id: crypto.symbol, // Usar symbol como id para mantener consistencia con Binance
      symbol: crypto.symbol.toLowerCase(),
      name: crypto.name,
      image: crypto.image,
      current_price: crypto.current_price,
      price_change_24h: crypto.price_change_24h,
      price_change_percentage_24h: crypto.price_change_percentage_24h,
      total_volume: crypto.total_volume,
    }));
  } catch (error) {
    console.error("Error in getCryptoList:", error);
    throw error;
  }
}
