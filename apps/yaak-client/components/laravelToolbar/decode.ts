// Reads Laravel Toolbar data from an HTTP response. Apps running nckrtl/laravel-toolbar (or
// php-data-bridge) send the payload in `x-toolbar` as base64 JSON. Over 32 KB they send
// `x-toolbar-summary` instead: base64 JSON `{ request_id, history_row }`, and the full payload
// loads from `/_toolbar/requests/{id}`, which answers `{ summary, raw }`.
import type { HttpResponseHeader } from "@yaakapp-internal/models";
import type { ToolbarData, ToolbarHistoryRow } from "./types";

export const TOOLBAR_HEADER = "x-toolbar";
export const TOOLBAR_SUMMARY_HEADER = "x-toolbar-summary";

export type ToolbarHeader =
  | { readonly kind: "full"; readonly data: ToolbarData }
  | { readonly kind: "summary"; readonly requestId: string; readonly row: ToolbarHistoryRow | null }
  | { readonly kind: "invalid"; readonly error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findHeader(headers: readonly HttpResponseHeader[] | null | undefined, name: string) {
  const header = headers?.find((h) => h.name.toLowerCase() === name);
  return header?.value.trim() ?? null;
}

export function hasToolbarHeader(headers: readonly HttpResponseHeader[] | null | undefined) {
  return (
    findHeader(headers, TOOLBAR_HEADER) != null ||
    findHeader(headers, TOOLBAR_SUMMARY_HEADER) != null
  );
}

/** Base64 (standard or URL-safe, padding optional) of UTF-8 JSON. Throws on bad input. */
export function decodeBase64Json(value: string): unknown {
  let normalized = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("The header is not base64");
  }
  normalized = normalized.replace(/=+$/, "");
  normalized += "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

function isHistoryRow(value: unknown): value is ToolbarHistoryRow {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.method === "string" &&
    typeof value.uri === "string"
  );
}

/** The toolbar data a response carries, or null when it has no toolbar headers. */
export function readToolbarHeader(
  headers: readonly HttpResponseHeader[] | null | undefined,
): ToolbarHeader | null {
  const full = findHeader(headers, TOOLBAR_HEADER);
  const summary = findHeader(headers, TOOLBAR_SUMMARY_HEADER);
  if (full != null) {
    try {
      const data = decodeBase64Json(full);
      if (isObject(data)) return { kind: "full", data: data as ToolbarData };
      return { kind: "invalid", error: "The x-toolbar header does not hold a JSON object" };
    } catch (err) {
      // A broken full header can still fall back to a valid summary.
      if (summary == null) {
        return {
          kind: "invalid",
          error: `Could not decode the x-toolbar header: ${errorText(err)}`,
        };
      }
    }
  }
  if (summary != null) {
    try {
      const value = decodeBase64Json(summary);
      const requestId = isObject(value) ? value.request_id : null;
      if (typeof requestId !== "string" || requestId === "") {
        return { kind: "invalid", error: "The x-toolbar-summary header has no request_id" };
      }
      const row = isObject(value) && isHistoryRow(value.history_row) ? value.history_row : null;
      return { kind: "summary", requestId, row };
    } catch (err) {
      return {
        kind: "invalid",
        error: `Could not decode the x-toolbar-summary header: ${errorText(err)}`,
      };
    }
  }
  return null;
}

/** Where the full payload for a summarized request loads from, on the response's origin. */
export function toolbarDetailsUrl(responseUrl: string, requestId: string): string | null {
  try {
    const { origin } = new URL(responseUrl);
    if (origin === "null") return null;
    return `${origin}/_toolbar/requests/${encodeURIComponent(requestId)}`;
  } catch {
    return null;
  }
}

/** The payload in a `/_toolbar/requests/{id}` answer: `raw` in `{ summary, raw }`. */
export function unwrapToolbarDetails(value: unknown): ToolbarData | null {
  if (!isObject(value)) return null;
  if ("raw" in value) {
    return isObject(value.raw) ? (value.raw as ToolbarData) : null;
  }
  // Tolerate an endpoint that answers with the payload itself.
  return "profiler" in value || "request_id" in value ? (value as ToolbarData) : null;
}

/** Parses the body of the details request, which the engine hands back as bytes. */
export function parseToolbarDetailsBody(body: ArrayLike<number>): ToolbarData | null {
  try {
    const text = new TextDecoder("utf-8").decode(new Uint8Array(Array.from(body)));
    return unwrapToolbarDetails(JSON.parse(text));
  } catch {
    return null;
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
