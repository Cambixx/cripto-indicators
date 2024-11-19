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

        const priceFilter = symbolInfo[ticker.symbol]?.filters.find(
          (f) => f.filterType === "PRICE_FILTER"
        );
        const tickSize = priceFilter
          ? Number(priceFilter.tickSize)
          : 0.00000001;

        const roundedPrice = Math.round(currentPrice / tickSize) * tickSize;

        return {
          id: baseAsset.toLowerCase(),
          symbol: baseAsset.toLowerCase(),
          name: CRYPTO_NAMES[baseAsset] || baseAsset,
          current_price: roundedPrice,
          image: `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${baseAsset.toLowerCase()}.png`,
          price_change_percentage_24h: priceChangePercent,
          market_cap: quoteVolume * roundedPrice,
          total_volume: volume * roundedPrice,
          high_24h: highPrice,
          low_24h: lowPrice,
          price_change_24h: priceChange,
          market_cap_rank: 0,
          tickSize: tickSize,
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
