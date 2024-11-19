import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="backdrop-blur-lg bg-background/80 sticky top-0 z-50 border-b border-border/40">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold tracking-tight">
              Crypto Trading View
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <ThemeToggle />
            <a
              href="https://binance-docs.github.io/apidocs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Powered by Binance API
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
