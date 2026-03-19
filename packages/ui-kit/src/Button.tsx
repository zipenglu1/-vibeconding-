import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_18px_40px_rgba(19,53,89,0.18)] hover:-translate-y-0.5",
        secondary: "bg-white/70 text-slate-900 shadow-none ring-1 ring-slate-200 hover:bg-white",
        outline: "bg-transparent text-slate-900 shadow-none ring-1 ring-slate-300 hover:bg-white/70",
        ghost: "bg-transparent text-slate-700 shadow-none hover:bg-slate-100/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
});

export { buttonVariants };
export default Button;
