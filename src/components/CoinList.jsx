export function CoinList({ coins, selectedCoin, onSelectCoin, isMobile }) {
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

  return (
    <div className={`flex flex-col ${isMobile ? "h-full" : ""}`}>
      <h2 className="text-lg font-semibold mb-2 md:mb-4">
        Top Cryptocurrencies
      </h2>
      <div
        className={`space-y-2 overflow-y-auto ${
          isMobile ? "flex-1" : "max-h-[calc(100vh-200px)]"
        }`}
      >
        {coins.map((coin) => (
          <button
            key={coin.id}
            onClick={() => onSelectCoin(coin)}
            className={`w-full p-2 md:p-4 rounded-lg transition-colors ${
              selectedCoin?.id === coin.id
                ? "bg-primary text-primary-foreground"
                : "bg-accent hover:bg-accent/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="w-5 h-5 md:w-6 md:h-6"
                  onError={(e) => {
                    e.target.src = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`;
                  }}
                />
                <div className="text-left">
                  <span className="block text-xs md:text-sm font-medium">
                    {coin.symbol.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs md:text-sm font-medium">
                  ${formatPrice(coin.current_price)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Vol: ${(coin.total_volume / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
