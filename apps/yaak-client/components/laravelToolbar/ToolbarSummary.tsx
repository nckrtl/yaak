import classNames from "classnames";
import type { ReactNode } from "react";
import { formatMs, queries, rowFromData, summarize, wallTimeMs } from "./model";
import { statusTone } from "./parts";
import type { ToolbarData, ToolbarHistoryRow } from "./types";

const TONE_CLASS = {
  default: "text-text-subtle",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  notice: "text-notice",
  primary: "text-primary",
} as const;

function Dot() {
  return <span className="text-text-subtlest">&bull;</span>;
}

/** Payload values are untrusted: only strings and numbers render as text. */
function text(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/** One line: status, method, route and action, then time, memory and query count. */
export function ToolbarSummary({
  data,
  row,
}: {
  data: ToolbarData;
  row?: ToolbarHistoryRow | null;
}) {
  const baseRow = row ?? rowFromData(data);
  const summary = baseRow ? summarize(baseRow, data) : null;
  const status = Number(summary?.status ?? data.response?.status_code) || null;
  const method = text(summary?.method ?? data.request?.method);
  const route = text(summary?.route) ?? text(summary?.uri) ?? "–";
  const action = text(summary?.action);
  const component = text(summary?.component);
  const all = queries(data);
  const duplicates = all.filter((q) => q.isDuplicate).length;
  const slow = all.filter((q) => q.isSlow).length;
  const memory = text(data.profiler?.total_allocated_memory?.formattedValue);
  const duration =
    text(data.profiler?.total_wall_time?.formattedValue) ??
    text(summary?.duration) ??
    formatMs(wallTimeMs(data));

  const items: ReactNode[] = [
    <span key="time" title="Wall time">
      {duration}
    </span>,
  ];
  if (memory) {
    items.push(
      <span key="memory" title="Peak allocated memory">
        {memory}
      </span>,
    );
  }
  if (data.queries != null) {
    items.push(
      <span key="queries" className={classNames(duplicates + slow > 0 && "text-warning")}>
        {all.length} {all.length === 1 ? "query" : "queries"}
        {duplicates > 0 && `, ${duplicates} dup`}
        {slow > 0 && `, ${slow} slow`}
      </span>,
    );
  }

  return (
    <div className="flex flex-col gap-0.5 mb-1 min-w-0 font-mono text-sm text-text-subtle">
      <div className="flex items-center gap-2 min-w-0">
        {status != null && <span className={TONE_CLASS[statusTone(status)]}>{String(status)}</span>}
        {method && <span className="text-text">{method}</span>}
        <span className="truncate text-text" title={text(summary?.uri) ?? undefined}>
          {route}
        </span>
        {action && (
          <>
            <span className="text-text-subtlest">→</span>
            <span className="truncate" title={action}>
              {action.split("\\").pop()}
            </span>
          </>
        )}
        {component && (
          <span className="truncate text-info" title="Page component">
            {component}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 min-w-0 text-xs">
        {items.flatMap((item, i) => (i === 0 ? [item] : [<Dot key={`dot-${i}`} />, item]))}
      </div>
    </div>
  );
}
