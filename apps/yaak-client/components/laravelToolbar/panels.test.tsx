import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vite-plus/test";
import { EnvironmentPanel } from "./EnvironmentPanel";
import fixture from "./fixtures/toolbarPayload.json";
import { ModelsPanel } from "./ModelsPanel";
import { QueriesPanel } from "./QueriesPanel";
import { TimelinePanel } from "./TimelinePanel";
import { ToolbarSummary } from "./ToolbarSummary";
import type { ToolbarData } from "./types";

vi.mock("@yaakapp-internal/platform", () => ({ platform: { osType: () => "macos" } }));
vi.mock("../../hooks/useHotKey", () => ({ useHotKey: vi.fn(), useFormattedHotkey: () => null }));

const data = fixture as unknown as ToolbarData;

describe("laravel toolbar panels with a real payload", () => {
  test("summarizes status, method, route, time, memory and queries", () => {
    const html = renderToStaticMarkup(<ToolbarSummary data={data} />);
    expect(html).toContain(">200<");
    expect(html).toContain(">GET<");
    expect(html).toContain("/pin");
    expect(html).toContain("Closure");
    expect(html).toContain("Auth/Pin");
    expect(html).toContain("58.6ms");
    expect(html).toContain("2.43 MB");
    expect(html).toContain("3 queries");
  });

  test("summarizes a history row before its payload loads, and survives junk", () => {
    const row = { id: "r1", method: "POST", uri: "/orders", status_code: 422, duration: "12ms" };
    const html = renderToStaticMarkup(<ToolbarSummary data={{}} row={row} />);
    expect(html).toContain(">422<");
    expect(html).toContain("/orders");
    expect(html).toContain("12ms");
    expect(html).not.toContain("queries");
    const junk = {
      profiler: { total_wall_time: { formattedValue: { evil: true } } },
      request: { method: ["GET"], controller_action: 5 },
    } as unknown as ToolbarData;
    expect(() => renderToStaticMarkup(<ToolbarSummary data={junk} />)).not.toThrow();
  });

  test("lays out the stages", () => {
    const html = renderToStaticMarkup(<TimelinePanel data={data} />);
    expect(html).toContain("Bootstrapping");
    expect(html).toContain("Memory");
  });

  test("lists the queries with their SQL", () => {
    const html = renderToStaticMarkup(<QueriesPanel data={data} />);
    expect(html).toContain("sessions");
    expect(html).toContain("Duplicates 1");
    expect(html).toContain(">pgsql<");
  });

  test("shows an empty state without models", () => {
    expect(renderToStaticMarkup(<ModelsPanel data={data} />)).toContain("No model events");
    const html = renderToStaticMarkup(
      <ModelsPanel data={{ models: [{ model: "App\\Models\\User", retrieved: 3 }] }} />,
    );
    expect(html).toContain("App\\Models\\User");
    expect(html).toContain("3 retrieved");
  });

  test("shows Laravel, PHP and PHP-FPM details", () => {
    const html = renderToStaticMarkup(<EnvironmentPanel data={data} />);
    expect(html).toContain("13.24.0");
    expect(html).toContain("8.5.9");
    expect(html).toContain("PHP-FPM");
    expect(html).toContain("E_ALL");
  });

  test("renders an empty payload without crashing", () => {
    for (const Panel of [TimelinePanel, QueriesPanel, ModelsPanel, EnvironmentPanel]) {
      expect(() => renderToStaticMarkup(<Panel data={{}} />)).not.toThrow();
    }
    expect(() => renderToStaticMarkup(<ToolbarSummary data={{}} />)).not.toThrow();
  });
});
