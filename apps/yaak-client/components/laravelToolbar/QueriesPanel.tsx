import classNames from "classnames";
import { useState } from "react";
import { SegmentedControl } from "../core/SegmentedControl";
import { formatMs, list, queries as toQueries, shortLocation, wallTimeMs } from "./model";
import { cellClass, Empty, Pill, Stat, StatStrip, tableClass } from "./parts";
import { SortHeader, useTableSort } from "./SortHeader";
import { sortTableRows } from "./tableSort";
import type { ToolbarData } from "./types";

type QueryFilter = "all" | "duplicates" | "slow";

const SQL_TOKENS =
  /('(?:[^']|'')*'|`[^`]*`|"[^"]*"|\b\d+(?:\.\d+)?\b|\b(?:select|from|where|and|or|in|is|not|null|order|by|asc|desc|limit|offset|count|as|update|set|insert|into|values|delete|join|left|inner|on|group|having|exists|distinct)\b)/gi;

function tokenClass(token: string) {
  if (token.startsWith("'")) return "text-success";
  if (token.startsWith("`") || token.startsWith('"')) return "text-text";
  if (/^\d/.test(token)) return "text-info";
  return "text-primary";
}

/** SQL with keywords, strings and numbers colored. */
export function SqlText({ sql }: { sql: string }) {
  // Keyed by character offset: the fragments of one statement never reorder.
  const fragments = sql
    .split(SQL_TOKENS)
    .reduce<{ text: string; start: number; token: boolean }[]>((acc, text, index) => {
      const previous = acc.at(-1);
      acc.push({
        text,
        start: previous ? previous.start + previous.text.length : 0,
        token: index % 2 === 1,
      });
      return acc;
    }, []);
  return (
    <span className="font-mono text-editor text-text-subtle break-all">
      {fragments.map((fragment) =>
        fragment.token ? (
          <span key={fragment.start} className={tokenClass(fragment.text)}>
            {fragment.text}
          </span>
        ) : (
          fragment.text
        ),
      )}
    </span>
  );
}

function bindingsText(bindings: unknown): string | null {
  if (!Array.isArray(bindings) || bindings.length === 0) return null;
  try {
    return JSON.stringify(bindings);
  } catch {
    return null;
  }
}

export function QueriesPanel({ data }: { data: ToolbarData }) {
  const [filter, setFilter] = useState<QueryFilter>("all");
  const sorting = useTableSort();
  const raw = list(data.queries?.queries);
  const all = toQueries(data).map((query, index) => ({
    ...query,
    index,
    bindings: bindingsText(raw[index]?.bindings),
  }));
  const recordedQueryTime = all.reduce((sum, query) => sum + query.durationMs, 0);
  const duplicateCount = all.filter((query) => query.isDuplicate).length;
  const slowCount = all.filter((query) => query.isSlow).length;
  const visible = sortTableRows(
    all.filter((query) =>
      filter === "duplicates" ? query.isDuplicate : filter === "slow" ? query.isSlow : true,
    ),
    sorting.sort,
    (query, column) => (column === "duration" ? query.durationMs : query.sql),
  );
  const totalTime = visible.reduce((sum, query) => sum + query.durationMs, 0);
  const wall = wallTimeMs(data);
  const database = list(data.queries?.databases)[0];

  return (
    <div className="h-full overflow-auto pb-3 pr-0.5">
      <StatStrip>
        <Stat
          label="Queries"
          value={visible.length}
          hint={
            [...new Set([database?.driver, database?.name])]
              .filter((v) => typeof v === "string" && v !== "")
              .join(" · ") || undefined
          }
        />
        <Stat
          label="Query time"
          value={formatMs(totalTime)}
          hint={wall ? `${Math.round((totalTime / wall) * 100)}% of the request` : undefined}
        />
        <Stat
          label="Duplicates"
          value={duplicateCount}
          hint="Same SQL and bindings"
          tone={duplicateCount > 0 ? "warning" : "default"}
        />
        <Stat label="Slow" value={slowCount} tone={slowCount > 0 ? "danger" : "default"} />
      </StatStrip>
      <div className="mb-2">
        <SegmentedControl<QueryFilter>
          name="laravel_toolbar_query_filter"
          label="Filter queries"
          hideLabel
          size="2xs"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${all.length}` },
            { value: "duplicates", label: `Duplicates ${duplicateCount}` },
            { value: "slow", label: `Slow ${slowCount}` },
          ]}
        />
      </div>
      {visible.length === 0 ? (
        <Empty>{all.length === 0 ? "No queries in this request" : "No queries match"}</Empty>
      ) : (
        <table className={tableClass}>
          <colgroup>
            <col />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr>
              <SortHeader column="query" label="Query" {...sorting} />
              <SortHeader column="duration" label="Duration" align="right" {...sorting} />
            </tr>
          </thead>
          <tbody>
            {visible.map((query) => {
              const location = shortLocation(query.file, query.line);
              return (
                <tr key={query.index} className="hover:bg-surface-highlight">
                  <td className={classNames(cellClass, "relative")}>
                    <div className="flex gap-2">
                      <span
                        aria-hidden
                        className={classNames(
                          "mt-0.5 h-4 w-0.5 shrink-0 rounded-full",
                          query.isSlow
                            ? "bg-danger"
                            : query.isDuplicate
                              ? "bg-warning"
                              : "bg-surface-active",
                        )}
                      />
                      <div className="min-w-0 flex-1 select-text cursor-text">
                        <SqlText sql={query.sql} />
                        {(location || query.bindings || query.isDuplicate || query.isSlow) && (
                          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-text-subtlest">
                            {location && (
                              <span className="shrink-0 font-mono" title={query.file ?? undefined}>
                                {location}
                              </span>
                            )}
                            {query.isDuplicate && <Pill tone="warning">Duplicate</Pill>}
                            {query.isSlow && <Pill tone="danger">Slow</Pill>}
                            {query.bindings && (
                              <span className="truncate font-mono" title={query.bindings}>
                                {query.bindings}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className={classNames(cellClass, "relative text-right font-mono tabular-nums")}
                  >
                    <div>{formatMs(query.durationMs)}</div>
                    <div
                      className="text-xs text-text-subtlest"
                      title="Database time spent on earlier queries"
                    >
                      +{formatMs(query.offset * recordedQueryTime)}
                    </div>
                    {/* Position within cumulative recorded query time, drawn on the row divider. */}
                    <div className="absolute inset-x-2 -bottom-px h-px" aria-hidden>
                      <div
                        className="absolute inset-y-0 bg-primary"
                        style={{
                          left: `${Math.min(query.offset, 1) * 100}%`,
                          width: `${Math.min(Math.max(query.share * 100, 0.4), 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
