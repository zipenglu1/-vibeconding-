import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800",
        className,
      )}
      {...props}
    />
  );
}

export default Badge;
