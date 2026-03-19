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
        "rounded-[1.5rem] border border-white/60 bg-white/78 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl",
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
