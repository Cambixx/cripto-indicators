export function Header() {
  return (
    <header className="border-b border-border">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Crypto Trading View</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <a
              href="https://www.coingecko.com/api/documentation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Powered by CoinGecko API
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
