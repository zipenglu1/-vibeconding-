import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[999px] border border-[#D7E4F2] bg-[#F4F8FC] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F7186]",
        className,
      )}
      {...props}
    />
  );
}

export default Badge;
