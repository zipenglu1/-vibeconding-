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

  const systemStatus = hero.error
    ? language === "zh"
      ? "异常"
      : "Alert"
    : hero.hasQueryResult
      ? language === "zh"
        ? "在线"
        : "Live"
      : language === "zh"
        ? "待机"
        : "Standby";

  const currentMode =
    hero.viewMode === "dashboard"
      ? copy.hero.dashboardButton
      : copy.hero.workspaceButton;

  const dataState = hero.hasQueryResult
    ? language === "zh"
      ? "已建模"
      : "Modeled"
    : language === "zh"
      ? "未执行"
      : "Idle";

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
    <div className="hero-grid">
      <div className="hero-stack">
        <p className="hero-kicker">Database_Admin_Light</p>
        <h1 className="hero-title">
          {hero.viewMode === "dashboard"
            ? copy.hero.dashboardTitle
            : copy.hero.workspaceTitle}
        </h1>
        <p className="hero-subcopy">
          {hero.viewMode === "dashboard"
            ? copy.hero.dashboardDescription
            : copy.hero.workspaceDescription}
        </p>

        <div className="hero-status-strip" aria-label="Workbench telemetry">
          <div className="hero-status-chip">
            <span>{language === "zh" ? "系统状态" : "System state"}</span>
            <strong>{systemStatus}</strong>
            <p>
              {hero.error ? (hero.error.code ?? hero.error.title) : hero.status}
            </p>
          </div>
          <div className="hero-status-chip">
            <span>{language === "zh" ? "当前模式" : "Current mode"}</span>
            <strong>{currentMode}</strong>
            <p>
              {hero.viewMode === "dashboard"
                ? "Dashboard workspace"
                : "Query workspace"}
            </p>
          </div>
          <div className="hero-status-chip">
            <span>{language === "zh" ? "数据状态" : "Data state"}</span>
            <strong>{dataState}</strong>
            <p>
              {hero.hasQueryResult
                ? language === "zh"
                  ? "数据视图可用"
                  : "Data views available"
                : language === "zh"
                  ? "等待数据装载"
                  : "Waiting for dataset load"}
            </p>
          </div>
        </div>

        <div className="hero-actions">
          <div
            className="hero-tablist"
            role="tablist"
            aria-label={copy.hero.dashboardTitle}
          >
            <Button
              ref={workspaceButtonRef}
              variant={hero.viewMode === "workspace" ? "default" : "secondary"}
              className="hero-tab-button"
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
              variant={hero.viewMode === "dashboard" ? "default" : "secondary"}
              className="hero-tab-button"
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
            <p className="hero-status-banner">{hero.status}</p>
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
        </div>
      </div>

      <div className="hero-language">
        <div className="grid gap-1">
          <span className="hero-language-label">{copy.hero.languageLabel}</span>
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

        <div className="hero-metrics">
          <div className="hero-metric">
            <span>{language === "zh" ? "页面名称" : "Page name"}</span>
            <strong>DB Admin</strong>
            <small>
              {language === "zh"
                ? "浅色数据库管理控制台"
                : "Light database admin canvas"}
            </small>
          </div>
          <div className="hero-metric">
            <span>{language === "zh" ? "布局模式" : "Layout mode"}</span>
            <strong>3 Columns</strong>
            <small>
              {language === "zh"
                ? "左导航 + 中央三栏工作区"
                : "Left rail plus three-column workspace"}
            </small>
          </div>
          <div className="hero-metric">
            <span>{language === "zh" ? "主色系统" : "Primary color"}</span>
            <strong>#007AFF</strong>
            <small>
              {language === "zh"
                ? "主按钮与描边按钮统一配色"
                : "Primary and outline actions share one accent"}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkbenchHeroWidget;
