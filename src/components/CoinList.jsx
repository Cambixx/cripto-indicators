export function CoinList({ coins, selectedCoin, onSelectCoin }) {
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
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
        Top Cryptocurrencies
      </h2>
      <div
        className="space-y-1.5 md:space-y-2 overflow-y-auto flex-1 pr-2 scrollbar-thin"
        style={{
          maxHeight: "calc(100vh - 190px)",
          height: "100%",
        }}
      >
        {coins.map((coin) => (
          <button
            key={coin.id}
            onClick={() => onSelectCoin(coin)}
            className={`w-full p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-250 ease-apple
              hover:scale-[1.01] active:scale-[0.99]
              ${
                selectedCoin?.id === coin.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card hover:bg-card/80"
              }
            `}
            style={{ touchAction: "manipulation" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 md:space-x-3">
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="w-6 h-6 md:w-8 md:h-8 rounded-lg transition-all duration-250 ease-apple"
                  onError={(e) => {
                    e.target.src = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`;
                  }}
                />
                <div className="text-left">
                  <span className="block text-xs md:text-sm font-medium">
                    {coin.symbol.toUpperCase()}
                  </span>
                  <span
                    className={`text-[0.6875rem] md:text-xs transition-colors duration-250 ease-apple ${
                      coin.price_change_percentage_24h >= 0
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-rose-500 dark:text-rose-400"
                    }`}
                  >
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs md:text-sm font-medium">
                  ${formatPrice(coin.current_price)}
                </span>
                <span className="text-[0.6875rem] md:text-xs text-muted-foreground">
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
