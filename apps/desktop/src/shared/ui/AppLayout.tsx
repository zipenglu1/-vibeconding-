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
    <main className="mx-auto flex w-[min(1560px,calc(100vw-120px))] flex-col gap-5 py-10 max-xl:w-[min(1400px,calc(100vw-88px))] max-lg:w-[min(100vw-48px,1400px)] max-md:w-[min(100vw-24px,1400px)] max-md:py-6">
      {hero ? (
        <Card className="overflow-hidden">
          <CardContent className="p-8 max-md:p-5">{hero}</CardContent>
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
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

export function SectionPanel({ children, className = "" }: PanelProps) {
  return (
    <Card as={"section" as never} className={cn(className)}>
      <CardContent className="grid gap-5 p-6">{children}</CardContent>
    </Card>
  );
}

export function PanelHeader({ title, meta }: PanelHeaderProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="m-0 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <span className="text-sm text-slate-500">{meta}</span>
    </div>
  );
}
