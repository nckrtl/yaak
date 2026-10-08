import { Icon } from "@yaakapp-internal/ui";
import classNames from "classnames";
import { useState } from "react";
import { nextTableSort, type TableSort } from "./tableSort";

export function useTableSort() {
  const [sort, setSort] = useState<TableSort>(null);
  return { sort, onSort: (column: string) => setSort((current) => nextTableSort(current, column)) };
}

export function SortHeader({
  column,
  label,
  sort,
  onSort,
  className,
  align = "left",
}: {
  column: string;
  label: string;
  sort: TableSort;
  onSort: (column: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const direction = sort?.column === column ? sort.direction : "none";
  const next =
    direction === "none"
      ? "ascending"
      : direction === "ascending"
        ? "descending"
        : "original order";
  return (
    <th
      scope="col"
      aria-sort={direction}
      className={classNames(
        className,
        "sticky top-0 z-10 bg-surface border-b border-b-surface-highlight",
        "py-1.5 px-2 font-normal text-text-subtle whitespace-nowrap",
      )}
    >
      <button
        type="button"
        aria-label={`${label}: sort ${next}`}
        onClick={() => onSort(column)}
        className={classNames(
          "flex w-full items-center gap-1 outline-none hover:text-text focus-visible:text-text",
          align === "right" && "justify-end text-right",
        )}
      >
        <span className="truncate">{label}</span>
        {direction === "ascending" && <Icon icon="arrow_up" size="xs" />}
        {direction === "descending" && <Icon icon="arrow_down" size="xs" />}
      </button>
    </th>
  );
}
