import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-sky-100",
        className,
      )}
      {...props}
    />
  );
}

export default Input;
