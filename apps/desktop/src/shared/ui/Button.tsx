import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_18px_40px_rgba(19,53,89,0.18)] hover:-translate-y-0.5",
  secondary:
    "bg-white/70 text-slate-900 shadow-none ring-1 ring-slate-200 hover:bg-white",
  outline:
    "bg-transparent text-slate-900 shadow-none ring-1 ring-slate-300 hover:bg-white/70",
  ghost: "bg-transparent text-slate-700 shadow-none hover:bg-slate-100/80",
};

function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export default Button;
