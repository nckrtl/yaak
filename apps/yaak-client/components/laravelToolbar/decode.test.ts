import { describe, expect, test } from "vite-plus/test";
import {
  decodeBase64Json,
  hasToolbarHeader,
  parseToolbarDetailsBody,
  readToolbarHeader,
  toolbarDetailsUrl,
  unwrapToolbarDetails,
} from "./decode";
import fixture from "./fixtures/toolbarPayload.json";

function base64(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes));
}

const row = { id: "abc123", method: "GET", uri: "/posts", status_code: 200 };

describe("laravel toolbar headers", () => {
  test("decodes a full payload from x-toolbar in any header case", () => {
    const headers = [{ name: "X-Toolbar", value: base64(fixture) }];
    expect(hasToolbarHeader(headers)).toBe(true);
    const result = readToolbarHeader(headers);
    expect(result?.kind).toBe("full");
    if (result?.kind !== "full") throw new Error("expected a full payload");
    expect(result.data.request_id).toBe(fixture.request_id);
    expect(result.data.request?.view_name).toBe("Auth/Pin");
  });

  test("returns null for responses without toolbar headers", () => {
    const headers = [{ name: "content-type", value: "text/html" }];
    expect(hasToolbarHeader(headers)).toBe(false);
    expect(readToolbarHeader(headers)).toBeNull();
    expect(readToolbarHeader(null)).toBeNull();
  });

  test("decodes UTF-8 and URL-safe base64 without padding", () => {
    const value = { request_id: "é✓", note: "?>?>" };
    const standard = base64(value);
    const urlSafe = standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeBase64Json(standard)).toEqual(value);
    expect(decodeBase64Json(urlSafe)).toEqual(value);
  });

  test("reports bad data instead of throwing", () => {
    expect(readToolbarHeader([{ name: "x-toolbar", value: "%%%not base64" }])).toMatchObject({
      kind: "invalid",
    });
    expect(readToolbarHeader([{ name: "x-toolbar", value: btoa("{not json") }])).toMatchObject({
      kind: "invalid",
    });
    expect(readToolbarHeader([{ name: "x-toolbar", value: base64([1, 2]) }])).toMatchObject({
      kind: "invalid",
    });
    expect(readToolbarHeader([{ name: "x-toolbar", value: btoa("\xff\xfe") }])).toMatchObject({
      kind: "invalid",
    });
    expect(
      readToolbarHeader([{ name: "x-toolbar-summary", value: base64({ history_row: row }) }]),
    ).toMatchObject({ kind: "invalid" });
  });

  test("reads a summary with its history row", () => {
    const headers = [
      { name: "X-Toolbar-Summary", value: base64({ request_id: "abc123", history_row: row }) },
    ];
    expect(hasToolbarHeader(headers)).toBe(true);
    expect(readToolbarHeader(headers)).toEqual({ kind: "summary", requestId: "abc123", row });
  });

  test("drops a malformed history row but keeps the request id", () => {
    const headers = [
      { name: "x-toolbar-summary", value: base64({ request_id: "abc", history_row: { id: 1 } }) },
    ];
    expect(readToolbarHeader(headers)).toEqual({ kind: "summary", requestId: "abc", row: null });
  });

  test("falls back to the summary when the full header is broken", () => {
    const headers = [
      { name: "x-toolbar", value: "!!!" },
      { name: "x-toolbar-summary", value: base64({ request_id: "abc" }) },
    ];
    expect(readToolbarHeader(headers)).toEqual({ kind: "summary", requestId: "abc", row: null });
  });
});

describe("laravel toolbar details", () => {
  test("builds the details URL on the response origin", () => {
    expect(toolbarDetailsUrl("https://app.test/posts/1?x=1", "abc 1")).toBe(
      "https://app.test/_toolbar/requests/abc%201",
    );
    expect(toolbarDetailsUrl("http://localhost:8000/", "a")).toBe(
      "http://localhost:8000/_toolbar/requests/a",
    );
    expect(toolbarDetailsUrl("not a url", "a")).toBeNull();
  });

  test("unwraps raw from { summary, raw }", () => {
    expect(unwrapToolbarDetails({ summary: row, raw: fixture })?.request_id).toBe(
      fixture.request_id,
    );
    expect(unwrapToolbarDetails({ summary: row, raw: null })).toBeNull();
    expect(unwrapToolbarDetails({ summary: row, raw: [1] })).toBeNull();
    expect(unwrapToolbarDetails({ request_id: "x", profiler: {} })?.request_id).toBe("x");
    expect(unwrapToolbarDetails({ message: "Unauthenticated." })).toBeNull();
    expect(unwrapToolbarDetails("nope")).toBeNull();
  });

  test("parses the engine's body bytes", () => {
    const bytes = Array.from(
      new TextEncoder().encode(JSON.stringify({ summary: row, raw: fixture })),
    );
    expect(parseToolbarDetailsBody(bytes)?.request_id).toBe(fixture.request_id);
    expect(parseToolbarDetailsBody(Array.from(new TextEncoder().encode("<html>")))).toBeNull();
  });
});
