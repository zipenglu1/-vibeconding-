import type { SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";

function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-sky-100",
        className,
      )}
      {...props}
    />
  );
}

export default Select;
