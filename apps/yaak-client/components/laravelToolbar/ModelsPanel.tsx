import classNames from "classnames";
import { list } from "./model";
import { cellClass, Empty, tableClass } from "./parts";
import { SortHeader, useTableSort } from "./SortHeader";
import { sortTableRows } from "./tableSort";
import type { ToolbarData, ToolbarModel } from "./types";

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function className(model: ToolbarModel): string {
  return typeof model.model === "string" ? model.model : "";
}

export function ModelsPanel({ data }: { data: ToolbarData }) {
  const sorting = useTableSort();
  const models = sortTableRows(list(data.models), sorting.sort, (model, column) => {
    if (column === "model") return className(model).split("\\").pop();
    if (column === "retrieved") return count(model.retrieved);
    if (column === "created") return count(model.created);
    if (column === "updated") return count(model.updated);
    return count(model.deleted);
  });
  const total = models.reduce((sum, model) => sum + count(model.retrieved), 0);
  const max = Math.max(1, ...models.map((model) => count(model.retrieved)));

  if (models.length === 0) {
    return <Empty>No model events recorded. Model tracking needs Laravel Telescope.</Empty>;
  }

  return (
    <div className="h-full overflow-auto pb-3 pr-0.5">
      <div className="mb-2 text-sm text-text-subtle">
        {total} retrieved across {models.length} {models.length === 1 ? "model" : "models"}
      </div>
      <table className={tableClass}>
        <colgroup>
          <col className="w-[40%]" />
          <col className="w-[24%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr>
            <SortHeader column="model" label="Model" {...sorting} />
            <SortHeader column="retrieved" label="Retrieved" {...sorting} />
            <SortHeader column="created" label="Created" align="right" {...sorting} />
            <SortHeader column="updated" label="Updated" align="right" {...sorting} />
            <SortHeader column="deleted" label="Deleted" align="right" {...sorting} />
          </tr>
        </thead>
        <tbody>
          {models.map((model, i) => {
            const fqcn = className(model);
            return (
              // oxlint-disable-next-line react/no-array-index-key -- class names may be missing
              <tr key={`${i}:${fqcn}`} className="hover:bg-surface-highlight">
                <td className={cellClass}>
                  <div className="truncate">{fqcn.split("\\").pop() || "–"}</div>
                  <div className="truncate font-mono text-xs text-text-subtlest" title={fqcn}>
                    {fqcn}
                  </div>
                </td>
                <td className={classNames(cellClass, "align-middle")}>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-right font-mono tabular-nums">
                      {count(model.retrieved)}
                    </span>
                    <span className="relative h-1.5 flex-1 rounded-full bg-surface-highlight">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        style={{ width: `${(count(model.retrieved) / max) * 100}%` }}
                      />
                    </span>
                  </div>
                </td>
                {(
                  [
                    ["created", count(model.created)],
                    ["updated", count(model.updated)],
                    ["deleted", count(model.deleted)],
                  ] as const
                ).map(([event, value]) => (
                  <td
                    key={event}
                    className={classNames(
                      cellClass,
                      "align-middle text-right font-mono tabular-nums",
                      !value && "text-text-subtlest",
                    )}
                  >
                    {value || "–"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
