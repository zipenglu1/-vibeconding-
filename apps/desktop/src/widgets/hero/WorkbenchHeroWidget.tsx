import { useRef, type KeyboardEvent } from "react";
import { Button, ErrorBanner, Select } from "@bi/ui-kit";
import type { WorkbenchHeroState } from "../../shared/lib/workbenchViewProps";
import { useAppUiStore } from "../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../shared/lib/i18n";

export interface WorkbenchHeroWidgetProps {
  hero: WorkbenchHeroState;
  onShowWorkspace: () => void;
  onShowDashboard: () => void;
}

function WorkbenchHeroWidget({
  hero,
  onShowWorkspace,
  onShowDashboard,
}: WorkbenchHeroWidgetProps) {
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const dashboardButtonRef = useRef<HTMLButtonElement>(null);
  const language = useAppUiStore((state) => state.language);
  const setLanguage = useAppUiStore((state) => state.setLanguage);
  const copy = getWorkbenchCopy(language);

  function handleViewKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: "workspace" | "dashboard",
  ) {
    if (!hero.hasQueryResult) {
      return;
    }

    let nextView: "workspace" | "dashboard" | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextView = currentView === "workspace" ? "dashboard" : "workspace";
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextView = currentView === "dashboard" ? "workspace" : "dashboard";
        break;
      case "Home":
        nextView = "workspace";
        break;
      case "End":
        nextView = "dashboard";
        break;
      default:
        return;
    }

    event.preventDefault();
    if (nextView === "workspace") {
      workspaceButtonRef.current?.focus();
      return;
    }

    dashboardButtonRef.current?.focus();
  }

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4 max-md:flex-col">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
          {copy.hero.eyebrow}
        </p>
        <div className="w-[11rem] rounded-2xl border border-slate-200 bg-white/75 p-3 shadow-sm">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {copy.hero.languageLabel}
          </span>
          <Select
            value={language}
            options={[
              { label: copy.hero.languageEnglish, value: "en" },
              { label: copy.hero.languageChinese, value: "zh" },
            ]}
            onValueChange={(value: string) =>
              setLanguage(value === "zh" ? "zh" : "en")
            }
          />
        </div>
      </div>
      <h1 className="mb-3 text-balance text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-none tracking-tight text-slate-950">
        {hero.viewMode === "dashboard"
          ? copy.hero.dashboardTitle
          : copy.hero.workspaceTitle}
      </h1>
      <p className="mb-7 max-w-3xl text-base text-slate-600">
        {hero.viewMode === "dashboard"
          ? copy.hero.dashboardDescription
          : copy.hero.workspaceDescription}
      </p>
      <div
        className="mb-4 flex flex-wrap gap-3 max-md:flex-col"
        role="tablist"
        aria-label={copy.hero.dashboardTitle}
      >
        <Button
          ref={workspaceButtonRef}
          variant="secondary"
          className={
            hero.viewMode === "workspace"
              ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
              : ""
          }
          role="tab"
          aria-selected={hero.viewMode === "workspace"}
          onClick={onShowWorkspace}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
            handleViewKeyDown(event, "workspace")
          }
        >
          {copy.hero.workspaceButton}
        </Button>
        <Button
          ref={dashboardButtonRef}
          variant="secondary"
          className={
            hero.viewMode === "dashboard"
              ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
              : ""
          }
          role="tab"
          aria-selected={hero.viewMode === "dashboard"}
          onClick={onShowDashboard}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
            handleViewKeyDown(event, "dashboard")
          }
          disabled={!hero.hasQueryResult}
        >
          {copy.hero.dashboardButton}
        </Button>
      </div>
      {!hero.error && hero.status ? (
        <p className="m-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          {hero.status}
        </p>
      ) : null}
      {hero.error ? (
        <ErrorBanner
          className="mt-0"
          title={hero.error.title}
          message={hero.error.message}
          details={hero.error.details}
          code={hero.error.code}
        />
      ) : null}
    </>
  );
}

export default WorkbenchHeroWidget;
