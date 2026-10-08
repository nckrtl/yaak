export type TableSort = { column: string; direction: "ascending" | "descending" } | null;
type SortValue = string | number | null | undefined;

export function nextTableSort(sort: TableSort, column: string): TableSort {
  if (sort?.column !== column) {
    return { column, direction: "ascending" };
  }
  return sort.direction === "ascending" ? { column, direction: "descending" } : null;
}

const TEXT_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function sortTableRows<T>(
  rows: readonly T[],
  sort: TableSort,
  value: (row: T, column: string) => SortValue,
): readonly T[] {
  if (!sort) {
    return rows;
  }
  return [...rows].sort((left, right) => {
    const a = value(left, sort.column);
    const b = value(right, sort.column);
    // Missing values stay at the bottom in either direction. Equal values retain source order.
    if (a == null) {
      return b == null ? 0 : 1;
    }
    if (b == null) {
      return -1;
    }
    const compared =
      typeof a === "number" && typeof b === "number"
        ? a - b
        : TEXT_COLLATOR.compare(String(a), String(b));
    return sort.direction === "ascending" ? compared : -compared;
  });
}

/** Formatted durations such as `1.2 s` or `500µs` in milliseconds. */
export function durationSortValue(duration: string | null): number | null {
  if (!duration) {
    return null;
  }
  const match = /^\s*([\d.]+)\s*(ns|μs|µs|us|ms|s|sec|min|m)?\s*$/i.exec(duration);
  if (!match) {
    return null;
  }
  const factors: Record<string, number> = {
    ns: 0.000001,
    μs: 0.001,
    µs: 0.001,
    us: 0.001,
    ms: 1,
    s: 1000,
    sec: 1000,
    min: 60000,
    m: 60000,
  };
  const value = Number(match[1]);
  return Number.isFinite(value) ? value * (factors[match[2]?.toLowerCase() ?? "ms"] ?? 1) : null;
}
