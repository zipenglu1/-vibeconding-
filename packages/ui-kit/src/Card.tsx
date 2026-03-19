import * as React from "react";
import { cn } from "./lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[1.5rem] border border-white/60 bg-white/78 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6", className)} {...props} />,
);

CardContent.displayName = "CardContent";

export { Card, CardContent };
