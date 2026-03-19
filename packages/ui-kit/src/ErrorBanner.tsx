import { cn } from "./cn";

interface ErrorBannerProps {
  title: string;
  message: string;
  details?: string | null;
  code?: string | null;
  className?: string;
}

function ErrorBanner({ title, message, details, code, className = "" }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-950",
        className,
      )}
      role="alert"
    >
      <strong className="text-sm font-semibold">{title}</strong>
      <p className="m-0 text-sm text-rose-900">{message}</p>
      {details ? <p className="m-0 break-words text-sm text-rose-800">{details}</p> : null}
      {code ? <p className="m-0 text-xs uppercase tracking-[0.08em] text-rose-700">Error code: {code}</p> : null}
    </div>
  );
}

export default ErrorBanner;
