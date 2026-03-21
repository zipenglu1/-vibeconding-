import type { ElementType, HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export function Card({
  as: Component = "div",
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "panel-card panel-grid rounded-[4px] border border-[#E7EDF4] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("p-6", className)} {...props} />;
}
