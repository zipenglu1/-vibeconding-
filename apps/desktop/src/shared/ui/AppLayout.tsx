import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card, CardContent } from "./Card";

interface AppShellProps extends PropsWithChildren {
  hero?: ReactNode;
}

interface GridProps extends PropsWithChildren {
  className?: string;
}

interface PanelProps extends PropsWithChildren {
  className?: string;
}

interface PanelHeaderProps {
  title: string;
  meta?: ReactNode;
}

export function AppShell({ hero, children }: AppShellProps) {
  return (
    <main className="app-shell mx-auto flex w-[min(1560px,calc(100vw-116px))] flex-col gap-5 py-8 max-xl:w-[min(1440px,calc(100vw-88px))] max-lg:w-[min(100vw-40px,1440px)] max-md:w-[min(100vw-24px,1440px)] max-md:py-5">
      {hero ? (
        <Card className="hero-card overflow-hidden">
          <CardContent className="p-6 max-md:p-5">{hero}</CardContent>
        </Card>
      ) : null}
      {children}
    </main>
  );
}

export function LayoutGrid({ children, className = "" }: GridProps) {
  return <section className={cn("grid gap-5", className)}>{children}</section>;
}

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <Card as={"article" as never} className={cn(className)}>
      <CardContent className="p-6 max-md:p-5">{children}</CardContent>
    </Card>
  );
}

export function SectionPanel({ children, className = "" }: PanelProps) {
  return (
    <Card as={"section" as never} className={cn(className)}>
      <CardContent className="grid gap-5 p-6 max-md:p-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function PanelHeader({ title, meta }: PanelHeaderProps) {
  return (
    <div className="panel-header mb-5 flex items-center justify-between gap-4">
      <h2 className="panel-header-title m-0 text-lg font-semibold text-[#1F2D3D]">
        {title}
      </h2>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7A8A9A]">
        {meta}
      </span>
    </div>
  );
}
