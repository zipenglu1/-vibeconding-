import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "button-clip border border-[#007AFF] bg-[#007AFF] text-white shadow-none hover:border-[#0067D6] hover:bg-[#0067D6]",
  secondary:
    "button-clip border border-[#007AFF] bg-white text-[#007AFF] shadow-none hover:bg-[#F3F8FF]",
  outline:
    "button-clip border border-[#C9D5E3] bg-white text-[#445468] shadow-none hover:bg-[#F8FBFF]",
  ghost:
    "border border-transparent bg-transparent text-[#6B7B8E] shadow-none hover:bg-[#F3F7FB] hover:text-[#1F2D3D]",
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
        "inline-flex min-h-10 min-w-[8rem] items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export default Button;
