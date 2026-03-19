import type {
  DashboardLayoutMetadata,
  DashboardSectionId,
  DashboardSectionLayout,
  DashboardSectionSize,
} from "@bi/ts-contracts";

export const DEFAULT_DASHBOARD_SECTIONS: DashboardSectionLayout[] = [
  { id: "chart", size: "wide" },
  { id: "query", size: "standard" },
  { id: "table", size: "wide" },
];

export function normalizeDashboardLayout(
  layout: DashboardLayoutMetadata | null | undefined,
): DashboardLayoutMetadata {
  const sections = layout?.sections ?? [];
  const seen = new Set<DashboardSectionId>();
  const normalized = sections.filter((section) => {
    if (seen.has(section.id)) {
      return false;
    }
    seen.add(section.id);
    return (
      section.id === "chart" || section.id === "query" || section.id === "table"
    );
  });

  for (const section of DEFAULT_DASHBOARD_SECTIONS) {
    if (!seen.has(section.id)) {
      normalized.push(section);
    }
  }

  return {
    view_mode: layout?.view_mode ?? "workspace",
    chart_variant: layout?.chart_variant ?? "bar",
    sections: normalized,
  };
}

export function moveDashboardSection(
  sections: DashboardSectionLayout[],
  sectionId: DashboardSectionId,
  direction: "up" | "down",
): DashboardSectionLayout[] {
  const currentIndex = sections.findIndex(
    (section) => section.id === sectionId,
  );
  if (currentIndex === -1) {
    return sections;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const nextSections = [...sections];
  const [moved] = nextSections.splice(currentIndex, 1);
  nextSections.splice(targetIndex, 0, moved);
  return nextSections;
}

export function toggleDashboardSectionSize(
  sections: DashboardSectionLayout[],
  sectionId: DashboardSectionId,
): DashboardSectionLayout[] {
  return sections.map((section) =>
    section.id === sectionId
      ? {
          ...section,
          size: nextSectionSize(section.size),
        }
      : section,
  );
}

function nextSectionSize(size: DashboardSectionSize): DashboardSectionSize {
  return size === "wide" ? "standard" : "wide";
}
