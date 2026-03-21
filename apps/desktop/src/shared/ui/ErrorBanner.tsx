import { cn } from "../lib/cn";

interface ErrorBannerProps {
  title: string;
  message: string;
  details?: string | null;
  code?: string | null;
  className?: string;
}

function ErrorBanner({
  title,
  message,
  details,
  code,
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-[4px] border border-[#F3C6C6] bg-[#FFF7F7] px-4 py-4 text-[#7F1D1D]",
        className,
      )}
      role="alert"
    >
      <strong className="text-sm font-semibold">{title}</strong>
      <p className="m-0 text-sm text-[#991B1B]">{message}</p>
      {details ? (
        <p className="m-0 break-words text-sm text-[#B45309]">{details}</p>
      ) : null}
      {code ? (
        <p className="m-0 text-xs uppercase tracking-[0.12em] text-[#B91C1C]/70">
          Error code: {code}
        </p>
      ) : null}
    </div>
  );
}

export default ErrorBanner;
