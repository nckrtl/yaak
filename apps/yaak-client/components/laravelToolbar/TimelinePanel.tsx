import classNames from "classnames";
import { formatBytes, formatMs, stages as toStages, wallTimeMs } from "./model";
import { Empty, Section, StageBar, Stat, StatStrip } from "./parts";
import type { ToolbarData } from "./types";

/** PHP's memory_limit ("128M", "1G", "-1") in bytes; null when unlimited or unknown. */
export function limitBytes(limit: string | undefined): number | null {
  const match = /^(\d+)([KMG])?$/i.exec(typeof limit === "string" ? limit : "");
  if (!match) {
    return null;
  }
  const units: Record<string, number> = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 };
  return Number(match[1]) * (units[(match[2] ?? "").toUpperCase()] ?? 1);
}

export function TimelinePanel({ data }: { data: ToolbarData }) {
  const total = wallTimeMs(data);
  const stages = toStages(data);
  const allocated = data.profiler?.total_allocated_memory;
  const limit = data.php?.memory_limit;
  const limitValue = limitBytes(limit);
  const growth = stages.filter((stage) => stage.memoryBytes > 0);
  const totalGrowth = growth.reduce((sum, stage) => sum + stage.memoryBytes, 0);
  // Waterfall: each stage starts where memory stood after the stage before it.
  const steps = stages.reduce<((typeof stages)[number] & { from: number; to: number })[]>(
    (list, stage) => {
      const from = list.at(-1)?.to ?? 0;
      list.push({ ...stage, from, to: from + stage.memoryBytes });
      return list;
    },
    [],
  );
  const low = Math.min(0, ...steps.map((step) => step.to));
  const high = Math.max(0, ...steps.map((step) => step.to));
  const span = high - low || 1;

  return (
    <div className="h-full overflow-auto pb-3 pr-0.5">
      <StatStrip>
        <Stat label="Wall time" value={formatMs(total)} hint="Total" />
        <Stat
          label="Allocated"
          value={allocated?.formattedValue ?? "–"}
          hint={
            limitValue && typeof allocated?.value === "number"
              ? `${((allocated.value / limitValue) * 100).toFixed(1)}% of ${limit}`
              : "Peak"
          }
        />
        <Stat
          label="Real memory"
          value={data.profiler?.total_real_memory?.formattedValue ?? "–"}
          hint="Peak"
        />
        <Stat label="Stages" value={stages.length} />
      </StatStrip>

      <Section title="Stages" aside="Wall time">
        {stages.length === 0 ? (
          <Empty>No stages recorded</Empty>
        ) : (
          <>
            <StageBar
              segments={stages.map((stage, i) => ({
                key: `${i}:${stage.label}`,
                color: stage.color,
                share: total ? stage.durationMs / total : 0,
              }))}
            />
            <div className="divide-y divide-surface-highlight">
              {stages.map((stage, i) => (
                <StageRow
                  // oxlint-disable-next-line react/no-array-index-key -- stage labels may repeat
                  key={`${i}:${stage.label}`}
                  label={stage.label}
                  color={stage.color}
                  left={total ? (stage.startMs / total) * 100 : 0}
                  width={Math.max(total ? (stage.durationMs / total) * 100 : 0, 0.8)}
                  value={formatMs(stage.durationMs)}
                  share={total ? `${Math.round((stage.durationMs / total) * 100)}%` : "–"}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      {steps.length > 0 && (
        <Section title="Memory" aside="Real memory change per stage">
          <div className="divide-y divide-surface-highlight">
            {steps.map((stage, i) => (
              <StageRow
                // oxlint-disable-next-line react/no-array-index-key -- stage labels may repeat
                key={`${i}:${stage.label}`}
                label={stage.label}
                color={stage.color}
                left={((Math.min(stage.from, stage.to) - low) / span) * 100}
                width={Math.max((Math.abs(stage.memoryBytes) / span) * 100, 0.6)}
                value={`${stage.memoryBytes > 0 ? "+" : ""}${formatBytes(stage.memoryBytes)}`}
                valueClassName={classNames(
                  stage.memoryBytes < 0 && "text-success",
                  stage.memoryBytes === 0 && "text-text-subtlest",
                )}
                share={
                  stage.memoryBytes > 0 && totalGrowth
                    ? `${Math.round((stage.memoryBytes / totalGrowth) * 100)}%`
                    : "–"
                }
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function StageRow({
  label,
  color,
  left,
  width,
  value,
  valueClassName,
  share,
}: {
  label: string;
  color: string;
  left: number;
  width: number;
  value: string;
  valueClassName?: string;
  share: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="flex w-36 shrink-0 items-center gap-2 min-w-0">
        <span className="h-3.5 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </div>
      <div className="relative h-1.5 flex-1 rounded-full bg-surface-highlight">
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ backgroundColor: color, left: `${left}%`, width: `${Math.min(width, 100)}%` }}
        />
      </div>
      <span
        className={classNames(
          "w-24 shrink-0 text-right font-mono tabular-nums whitespace-nowrap",
          valueClassName,
        )}
      >
        {value}
      </span>
      <span className="w-9 shrink-0 text-right text-text-subtle tabular-nums">{share}</span>
    </div>
  );
}
