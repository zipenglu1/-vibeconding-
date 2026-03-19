import { expect, test, type Page } from "@playwright/test";

const sampleCsvPath = "E:\\fixtures\\sales.csv";
const exportedSnapshotPath = "E:\\exports\\offline-bi-project-export.json";
const exportedCsvPath = "E:\\exports\\revenue-by-city.csv";
const exportedXlsxPath = "E:\\exports\\revenue-by-city.xlsx";
const exportedPdfPath = "E:\\exports\\revenue-by-city.pdf";
const cachedParquetPath = "E:\\workspace\\cache\\sales.parquet";

const loadedDataSource = {
  info: {
    name: "sales",
    type: "csv",
    path: sampleCsvPath,
    cache_path: cachedParquetPath,
    tables: ["default"],
  },
  columns: [
    { name: "city", data_type: "string" },
    { name: "revenue", data_type: "number" },
    { name: "status", data_type: "string" },
    { name: "region", data_type: "string" },
  ],
  preview_rows: [
    { city: "Hong Kong", revenue: "120.5", status: "won", region: "APAC" },
    { city: "Shenzhen", revenue: "280", status: "pending", region: "APAC" },
    { city: "Singapore", revenue: "90", status: "won", region: "APAC" },
    { city: "Berlin", revenue: "75", status: "lost", region: "EMEA" },
  ],
  total_rows: 4,
};

const queryResult = {
  columns: ["city", "total_revenue"],
  rows: [
    { city: "Shenzhen", total_revenue: 280 },
    { city: "Hong Kong", total_revenue: 120.5 },
  ],
  totalRows: 2,
  executionTimeMs: 7,
};

const profileResult = {
  row_count: 4,
  field_count: 4,
  fields: [
    {
      name: "city",
      data_type: "VARCHAR",
      non_null_count: 4,
      null_count: 0,
      distinct_count: 4,
      sample_values: ["Berlin", "Hong Kong", "Shenzhen"],
    },
    {
      name: "revenue",
      data_type: "DOUBLE",
      non_null_count: 4,
      null_count: 0,
      distinct_count: 4,
      sample_values: ["75.0", "120.5", "280.0"],
    },
  ],
};

const backendRecommendation = {
  suggestion: {
    title: "Revenue by city",
    dimension_field: "city",
    measure_field: "revenue",
    aggregation: "sum",
    chart_hint: "line",
    reason: "Detected categorical field 'city' and numeric field 'revenue'.",
  },
  chart_spec: {
    title: "Revenue by city",
    chart_type: "line",
    category_axis: {
      field: "city",
      label: "city",
    },
    value_axis: {
      field: "revenue",
      label: "sum_revenue",
    },
    series: [
      {
        field: "revenue",
        label: "sum_revenue",
        aggregation: "sum",
      },
    ],
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({
      initialDataSource,
      initialQueryResult,
      initialRecommendation,
      csvPath,
      exportProjectPath,
      exportCsvPath,
      exportXlsxPath,
      exportPdfPath,
      initialProfileResult,
    }) => {
      const savedProjects = [];
      const storedProjects = {};
      const exportedSnapshots = {};
      const loadJobResults = {};
      const profileJobResults = {};
      const jobs = {};
      const commandCalls = [];
      let nextJobId = 1;

      function clone(value) {
        return JSON.parse(JSON.stringify(value));
      }

      function slugify(value) {
        return (
          String(value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "project"
        );
      }

      function saveProjectSummary(metadata) {
        const nextSummary = {
          id: metadata.id,
          name: metadata.name,
          active_data_source_path: metadata.active_data_source_path ?? null,
        };
        const existingIndex = savedProjects.findIndex(
          (project) => project.id === metadata.id,
        );
        if (existingIndex === -1) {
          savedProjects.push(nextSummary);
        } else {
          savedProjects[existingIndex] = nextSummary;
        }
        savedProjects.sort((left, right) =>
          left.name.localeCompare(right.name, undefined, {
            sensitivity: "base",
          }),
        );
      }

      function createJobSnapshot(job, overrides) {
        return {
          job_id: job.job_id,
          kind: job.kind,
          status: job.status,
          message: job.message,
          duration_ms: job.duration_ms,
          completed: job.completed,
          ...overrides,
        };
      }

      function createExportJob(format, exportPath, queryName) {
        const jobId = `job-${nextJobId}`;
        nextJobId += 1;
        const behaviour = format === "pdf" ? "cancel" : "success";
        const job = {
          job_id: jobId,
          kind: `export_${format}`,
          status: "queued",
          message: "Queued",
          duration_ms: 0,
          completed: false,
          poll_count: 0,
          behaviour,
          export_path: exportPath,
          query_name: queryName,
          cancel_requested: false,
        };
        jobs[jobId] = job;
        return {
          job_id: jobId,
          kind: job.kind,
        };
      }

      function createLoadDataSourceJob(path) {
        if (path !== csvPath) {
          throw new Error(
            JSON.stringify({
              code: "data_source_not_found",
              message: "The requested data source could not be found.",
              details: String(path ?? ""),
            }),
          );
        }

        const jobId = `job-${nextJobId}`;
        nextJobId += 1;
        jobs[jobId] = {
          job_id: jobId,
          kind: "load_data_source",
          status: "queued",
          message: "Queued",
          duration_ms: 0,
          completed: false,
          poll_count: 0,
          behaviour: "success",
          source_path: path,
          cancel_requested: false,
        };
        loadJobResults[jobId] = clone(initialDataSource);
        return {
          job_id: jobId,
          kind: "load_data_source",
        };
      }

      function createProfileDataSourceJob(
        dataSourceName,
        dataSourcePath,
        cachePath,
        dataSourceType,
      ) {
        const profilePath =
          cachePath || (dataSourceType === "parquet" ? dataSourcePath : "");
        if (!profilePath) {
          throw new Error(
            JSON.stringify({
              code: "data_source_invalid",
              message:
                "Profiling requires a cached Parquet artifact or a Parquet data source.",
              details: String(dataSourcePath ?? ""),
            }),
          );
        }

        const jobId = `job-${nextJobId}`;
        nextJobId += 1;
        jobs[jobId] = {
          job_id: jobId,
          kind: "profile_data_source",
          status: "queued",
          message: "Queued",
          duration_ms: 0,
          completed: false,
          poll_count: 0,
          behaviour: "success",
          source_path: profilePath,
          data_source_name: dataSourceName,
        };
        profileJobResults[jobId] = clone(initialProfileResult);
        return {
          job_id: jobId,
          kind: "profile_data_source",
        };
      }

      window.__OFFLINE_BI_TEST_STATE__ = {
        commandCalls,
        jobs,
        exportedSnapshots,
        loadJobResults,
        profileJobResults,
      };

      window.__OFFLINE_BI_TEST_API__ = {
        async open(options) {
          const isJsonPicker =
            Array.isArray(options?.filters) &&
            options.filters.some(
              (filter) =>
                Array.isArray(filter.extensions) &&
                filter.extensions.includes("json"),
            );
          if (isJsonPicker) {
            return exportProjectPath;
          }
          return csvPath;
        },
        async save(options) {
          const title = String(options?.title ?? "");
          if (title.includes("project snapshot")) {
            return exportProjectPath;
          }
          if (title.includes("XLSX")) {
            return exportXlsxPath;
          }
          if (title.includes("PDF")) {
            return exportPdfPath;
          }
          return exportCsvPath;
        },
        async invoke(command, args) {
          commandCalls.push({ command, args });

          switch (command) {
            case "list_saved_projects":
              return clone(savedProjects);
            case "load_data_source":
              if (args?.path !== csvPath) {
                throw new Error(
                  JSON.stringify({
                    code: "data_source_not_found",
                    message: "The requested data source could not be found.",
                    details: String(args?.path ?? ""),
                  }),
                );
              }
              return clone(initialDataSource);
            case "start_load_data_source_job":
              return createLoadDataSourceJob(String(args?.path));
            case "take_load_data_source_job_result": {
              const jobId = String(args?.jobId);
              const result = clone(loadJobResults[jobId] ?? null);
              delete loadJobResults[jobId];
              return result;
            }
            case "start_profile_data_source_job":
              return createProfileDataSourceJob(
                String(args?.dataSourceName),
                String(args?.dataSourcePath),
                args?.cachePath ? String(args.cachePath) : null,
                String(args?.dataSourceType),
              );
            case "take_profile_data_source_job_result": {
              const jobId = String(args?.jobId);
              const result = clone(profileJobResults[jobId] ?? null);
              delete profileJobResults[jobId];
              return result;
            }
            case "save_project_metadata": {
              const metadata = clone(args?.metadata);
              storedProjects[metadata.id] = metadata;
              saveProjectSummary(metadata);
              return;
            }
            case "load_project_metadata":
              return clone(storedProjects[String(args?.projectId)] ?? null);
            case "suggest_query_configurations":
              return [clone(initialRecommendation)];
            case "execute_query":
              return clone(initialQueryResult);
            case "generate_chart_spec":
              return clone(initialRecommendation.chart_spec);
            case "export_project_snapshot": {
              const project = clone(args?.project);
              storedProjects[project.id] = project;
              saveProjectSummary(project);
              exportedSnapshots[String(args?.exportPath)] = {
                format_version: "1.0.0",
                exported_at: String(args?.exportedAt),
                project,
                loaded_data_sources: clone(args?.loadedDataSources ?? []),
              };
              return;
            }
            case "import_project_snapshot": {
              const payload = clone(
                exportedSnapshots[String(args?.importPath)] ?? null,
              );
              if (!payload) {
                throw new Error("Snapshot not found.");
              }
              if (!payload.project.id) {
                payload.project.id = slugify(payload.project.name);
              }
              storedProjects[payload.project.id] = clone(payload.project);
              saveProjectSummary(payload.project);
              return payload;
            }
            case "start_export_query_result_job":
              return createExportJob(
                String(args?.format),
                String(args?.exportPath),
                String(args?.queryName),
              );
            case "get_job_status": {
              const job = jobs[String(args?.jobId)];
              if (!job) {
                return null;
              }

              job.poll_count += 1;

              if (job.cancel_requested) {
                job.status = "cancelled";
                job.message = "Cancelled";
                job.duration_ms = 8;
                job.completed = true;
                return createJobSnapshot(job);
              }

              if (job.poll_count === 1) {
                job.status = "running";
                job.message =
                  job.kind === "load_data_source"
                    ? `Loading ${job.source_path}`
                    : `Exporting ${job.query_name}`;
                job.duration_ms = 3;
                return createJobSnapshot(job);
              }

              if (job.kind === "load_data_source") {
                job.status = "succeeded";
                job.message = "Loaded data source";
                job.duration_ms = 9;
                job.completed = true;
                return createJobSnapshot(job);
              }

              if (job.kind === "profile_data_source") {
                job.status = "succeeded";
                job.message = `Profiled ${job.data_source_name}`;
                job.duration_ms = 12;
                job.completed = true;
                return createJobSnapshot(job);
              }

              if (job.behaviour === "success") {
                job.status = "succeeded";
                job.message = "Export completed";
                job.duration_ms = 11;
                job.completed = true;
                return createJobSnapshot(job);
              }

              job.status = "running";
              job.message = "Awaiting cancellation";
              job.duration_ms = 6;
              return createJobSnapshot(job);
            }
            case "cancel_job": {
              const job = jobs[String(args?.jobId)];
              if (!job || job.completed) {
                return false;
              }
              job.cancel_requested = true;
              return true;
            }
            default:
              throw new Error(`Unhandled mock command: ${command}`);
          }
        },
      };
    },
    {
      initialDataSource: loadedDataSource,
      initialQueryResult: queryResult,
      initialRecommendation: backendRecommendation,
      csvPath: sampleCsvPath,
      exportProjectPath: exportedSnapshotPath,
      exportCsvPath: exportedCsvPath,
      exportXlsxPath: exportedXlsxPath,
      exportPdfPath: exportedPdfPath,
      initialProfileResult: profileResult,
    },
  );

  await page.goto("/");
});

async function loadSampleData(page: Page) {
  await page.getByRole("button", { name: "Choose File" }).click();
  await expect(page.locator("#data-source-path")).toHaveValue(sampleCsvPath);
  await expect(
    page.getByText('Loaded data source "sales" with 4 rows.').first(),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Hong Kong" })).toBeVisible();
}

async function showWorkspace(page: Page) {
  const queryBuilderHeading = page.getByText("Query Builder");
  if (await queryBuilderHeading.isVisible()) {
    return;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await queryBuilderHeading.isVisible()) {
      return;
    }

    const workspaceButton = page
      .getByRole("button", {
        name: "Workspace",
        exact: true,
      })
      .first();

    try {
      if ((await workspaceButton.count()) > 0) {
        await workspaceButton.click({ timeout: 15_000 });
      }
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
    }

    if (await queryBuilderHeading.isVisible()) {
      return;
    }

    await page.waitForTimeout(500);
  }

  await expect(queryBuilderHeading).toBeVisible({ timeout: 15_000 });
}

async function runRevenueQuery(page: Page) {
  await loadSampleData(page);
  await page.getByRole("button", { name: "Run Query" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Returned rows")).toBeVisible();
  await expect(page.getByText("Result Table")).toBeVisible();
}

test("switches the workbench language between English and Chinese", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Analysis workspace" }),
  ).toBeVisible();

  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "中文" }).click();

  await expect(page.getByRole("heading", { name: "分析工作区" })).toBeVisible();
  await expect(page.getByText("语言")).toBeVisible();
  await expect(page.getByRole("button", { name: "选择文件" })).toBeVisible();

  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "English" }).click();

  await expect(
    page.getByRole("heading", { name: "Analysis workspace" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose File" })).toBeVisible();
});

test("loads a file and shows preview details", async ({ page }) => {
  await loadSampleData(page);

  await expect(page.getByText("Data source load")).toBeVisible();
  await expect(page.getByText("Status: Succeeded")).toBeVisible();
  await expect(page.getByText("4 rows").first()).toBeVisible();
  await expect(page.getByLabel("Preview columns")).toContainText("city");
  await expect(page.getByLabel("Preview columns")).toContainText("revenue");
  await expect(page.getByRole("cell", { name: "Hong Kong" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "120.5" })).toBeVisible();
});

test("runs a query and renders the dashboard plus workspace preview", async ({
  page,
}) => {
  await runRevenueQuery(page);

  await expect(page.getByText("Returned rows")).toBeVisible();
  await expect(page.getByText("Result Table")).toBeVisible();
  await showWorkspace(page);
  await expect(page.getByText("Workspace Result Preview")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Shenzhen" }).first(),
  ).toBeVisible();
});

test("applies a backend recommendation and uses backend chart spec generation", async ({
  page,
}) => {
  await loadSampleData(page);

  await expect(
    page.getByRole("heading", { name: "Backend Recommendation" }),
  ).toBeVisible();
  await expect(
    page.getByText("Revenue by city", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Suggested chart: line")).toBeVisible();

  await page.getByRole("button", { name: "Apply Recommendation" }).click();

  await expect(page.locator('input[value="Revenue by city"]')).toBeVisible();
  await expect(page.getByRole("combobox").nth(1)).toContainText("city");
  await expect(page.getByRole("combobox").nth(2)).toContainText("revenue");

  await page.getByRole("button", { name: "Run Query" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();

  const commandNames = await page.evaluate(() =>
    window.__OFFLINE_BI_TEST_STATE__.commandCalls.map((entry) => entry.command),
  );

  expect(commandNames).toContain("start_load_data_source_job");
  expect(commandNames).toContain("take_load_data_source_job_result");
  expect(commandNames).toContain("suggest_query_configurations");
  expect(commandNames).toContain("generate_chart_spec");
});

test("saves and reopens a project from the saved list", async ({ page }) => {
  await loadSampleData(page);
  await page.getByLabel("Project name").fill("Executive Review");
  await page.getByRole("button", { name: "Save Project" }).click();

  await expect(
    page
      .getByText('Saved project "Executive Review" with 1 data sources.')
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Executive Review executive-review" }),
  ).toBeVisible();

  await page.getByLabel("Project name").fill("Temporary Name");
  await page
    .getByRole("button", { name: "Executive Review executive-review" })
    .click();

  await expect(page.getByLabel("Project name")).toHaveValue("Executive Review");
  await expect(
    page
      .getByText('Opened project "Executive Review" with 1 data sources.')
      .first(),
  ).toBeVisible();
  await expect(page.locator("#data-source-path")).toHaveValue(sampleCsvPath);
});

test("completes a CSV export job and records it in job activity", async ({
  page,
}) => {
  await runRevenueQuery(page);
  await showWorkspace(page);

  await page.getByRole("button", { name: "Export CSV" }).click();

  await expect(page.getByText("Job activity")).toBeVisible();
  await expect(page.getByText("CSV export")).toBeVisible();
  await expect(page.getByText("Status: Succeeded")).toBeVisible();
  await expect(page.getByText("Export completed")).toBeVisible();

  const commandNames = await page.evaluate(() =>
    window.__OFFLINE_BI_TEST_STATE__.commandCalls.map((entry) => entry.command),
  );

  expect(commandNames).toContain("start_export_query_result_job");
  expect(commandNames).toContain("get_job_status");
});

test("cancels an export job from the job activity panel", async ({ page }) => {
  await runRevenueQuery(page);
  await showWorkspace(page);

  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(page.getByText("Awaiting cancellation").first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).first().click();

  await expect(page.getByText("PDF export cancelled.").first()).toBeVisible();
  await expect(page.getByText("Status: Cancelled")).toBeVisible();

  const commandNames = await page.evaluate(() =>
    window.__OFFLINE_BI_TEST_STATE__.commandCalls.map((entry) => entry.command),
  );

  expect(commandNames).toContain("cancel_job");
});

test("profiles the active data source and surfaces the result in workspace job activity", async ({
  page,
}) => {
  await loadSampleData(page);
  await showWorkspace(page);

  await page.getByRole("button", { name: "Profile Data" }).click();

  await expect(page.getByText("Data profile")).toBeVisible();
  await expect(page.getByText("Status: Succeeded")).toBeVisible();
  await expect(
    page.getByText('Profiled "sales" with 4 fields across 4 rows.').first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data Profile" }),
  ).toBeVisible();
  await expect(
    page.getByText("4 rows profiled from the current cached Parquet source."),
  ).toBeVisible();
  await expect(
    page.getByText("Distinct 4 | Null 0 | Non-null 4").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Samples: Berlin, Hong Kong, Shenzhen"),
  ).toBeVisible();

  const commandNames = await page.evaluate(() =>
    window.__OFFLINE_BI_TEST_STATE__.commandCalls.map((entry) => entry.command),
  );

  expect(commandNames).toContain("start_profile_data_source_job");
  expect(commandNames).toContain("take_profile_data_source_job_result");
  expect(commandNames).toContain("get_job_status");
});

test("imports a previously exported project snapshot and restores the saved dashboard view", async ({
  page,
}) => {
  await runRevenueQuery(page);
  await showWorkspace(page);
  await page.getByLabel("Project name").fill("Portable Snapshot");
  await page.getByRole("button", { name: "Save Dashboard View" }).click();
  await page.getByRole("button", { name: "Export Project JSON" }).click();

  await expect(
    page
      .getByText(
        `Exported project "Portable Snapshot" to ${exportedSnapshotPath}.`,
      )
      .first(),
  ).toBeVisible();

  await page.getByLabel("Project name").fill("Local Draft");
  await page.getByRole("button", { name: "Import Project JSON" }).click();

  await expect(page.getByLabel("Project name")).toHaveValue(
    "Portable Snapshot",
  );
  await expect(
    page
      .getByText('Imported project "Portable Snapshot" with 1 data sources.')
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Dashboard views")).toBeVisible();
  await expect(page.getByText("No saved dashboard views yet.")).toHaveCount(0);
  await expect(page.locator("#data-source-path")).toHaveValue(sampleCsvPath);

  const commandNames = await page.evaluate(() =>
    window.__OFFLINE_BI_TEST_STATE__.commandCalls.map((entry) => entry.command),
  );

  expect(commandNames).toContain("export_project_snapshot");
  expect(commandNames).toContain("import_project_snapshot");
});
