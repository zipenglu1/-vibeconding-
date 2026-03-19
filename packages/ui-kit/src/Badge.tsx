import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-sky-200 bg-sky-100 text-sky-800",
        secondary: "border-slate-200 bg-slate-100 text-slate-700",
        outline: "border-slate-300 bg-transparent text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export default Badge;
