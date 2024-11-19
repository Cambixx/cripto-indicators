import { useState, useEffect } from "react";

export function CoinList({ coins, selectedCoin, onSelectCoin }) {
  // Estado para los favoritos
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar favoritos en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const formatPrice = (price) => {
    if (price < 0.00001) return price.toFixed(8);
    if (price < 0.0001) return price.toFixed(7);
    if (price < 0.001) return price.toFixed(6);
    if (price < 0.01) return price.toFixed(5);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toFixed(2);
  };

  // Función para alternar favoritos
  const toggleFavorite = (coinId, e) => {
    e.stopPropagation(); // Evitar que se seleccione la moneda al hacer click en el botón
    setFavorites((prev) =>
      prev.includes(coinId)
        ? prev.filter((id) => id !== coinId)
        : [...prev, coinId]
    );
  };

  // Ordenar monedas: favoritos primero, luego el resto
  const sortedCoins = [...coins].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

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
        {sortedCoins.map((coin) => (
          <button
            key={coin.id}
            onClick={() => onSelectCoin(coin)}
            className={`group w-full p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-250 ease-apple
              hover:scale-[1.01] active:scale-[0.99] relative
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

            {/* Botón de favorito */}
            <button
              onClick={(e) => toggleFavorite(coin.id, e)}
              className={`absolute right-2 top-0 p-1.5 rounded-full transition-all duration-250 ease-apple
                opacity-0 group-hover:opacity-100 focus:opacity-100
                ${
                  favorites.includes(coin.id)
                    ? "opacity-100 text-yellow-500"
                    : "hover:text-yellow-500"
                }
                ${
                  selectedCoin?.id === coin.id
                    ? "hover:bg-primary-foreground/10"
                    : "hover:bg-background/10"
                }
              `}
              aria-label={
                favorites.includes(coin.id)
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={favorites.includes(coin.id) ? "currentColor" : "none"}
                stroke="currentColor"
                className="w-3.5 h-3.5"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
