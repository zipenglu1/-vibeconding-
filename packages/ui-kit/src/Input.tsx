import * as React from "react";
import { cn } from "./lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
