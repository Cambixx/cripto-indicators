export function Modal({ isOpen, onClose, type, message }) {
  if (!isOpen) return null;

  const isGreenCross = type === "green";

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md p-6 rounded-xl bg-card shadow-lg border border-border/40 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              isGreenCross ? "bg-emerald-500/20" : "bg-rose-500/20"
            }`}
          >
            {isGreenCross ? (
              <svg
                className="w-6 h-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                />
              </svg>
            )}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {isGreenCross ? "Señal Alcista" : "Señal Bajista"}
            </h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
