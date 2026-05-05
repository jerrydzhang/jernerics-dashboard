interface PanelMessageProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export function PanelMessage({ children, onRetry }: PanelMessageProps) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center bg-surface p-8 text-sm text-muted">
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 cursor-pointer text-primary hover:text-bright"
        >
          Retry
        </button>
      )}
    </div>
  );
}
