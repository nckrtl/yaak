// Small building blocks shared by the Toolbar panels, drawn with Yaak's theme tokens.
import classNames from "classnames";
import type { ReactNode } from "react";

export type Tone = "default" | "success" | "warning" | "danger" | "info" | "notice" | "primary";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-text",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  notice: "text-notice",
  primary: "text-primary",
};

/** A compact outlined chip, for flags such as Duplicate or Shared. */
export function Pill({
  tone = "default",
  mono,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={classNames(
        "inline-flex shrink-0 items-center rounded-sm border border-border-subtle",
        "px-1 h-4 text-2xs leading-none whitespace-nowrap",
        mono && "font-mono",
        tone === "default" ? "text-text-subtle" : TONE_TEXT[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: number | null | undefined): Tone {
  if (status == null) return "default";
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "primary";
  if (status >= 200) return "success";
  return "info";
}

/** One row of stats split by thin dividers. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className={classNames(
        "grid auto-cols-fr grid-flow-col divide-x divide-surface-highlight",
        "border border-border-subtle rounded-md mb-3",
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 flex-col px-3 py-2">
      <span className="truncate text-xs text-text-subtle">{label}</span>
      <span className={classNames("truncate text-lg tabular-nums", TONE_TEXT[tone])}>{value}</span>
      <span className="truncate text-xs text-text-subtlest">{hint ?? " "}</span>
    </div>
  );
}

/** A titled block in a panel. */
export function Section({
  title,
  aside,
  className,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={classNames(className, "mb-4 last:mb-0")}>
      {title != null && (
        <h3 className="flex items-center justify-between gap-2 mb-1 text-sm text-text-subtle">
          <span>{title}</span>
          {aside != null && <span className="text-xs text-text-subtlest">{aside}</span>}
        </h3>
      )}
      {children}
    </section>
  );
}

/** Label and value rows: the label column is sans and subtle, values mono unless `sans`. */
export function InfoRows({
  rows,
}: {
  rows: readonly (readonly [string, ReactNode] | readonly [string, ReactNode, "sans"])[];
}) {
  if (rows.length === 0) return <Empty>Nothing recorded</Empty>;
  return (
    <table className="w-full min-w-0 text-sm">
      <tbody className="divide-y divide-surface-highlight">
        {rows.map(([label, value, kind]) => (
          <tr key={label}>
            <td className="py-1 pr-4 align-top whitespace-nowrap text-text-subtle w-0">{label}</td>
            <td
              className={classNames(
                "py-1 align-top break-all select-text cursor-text",
                kind === "sans" ? "font-sans" : "font-mono text-editor",
              )}
            >
              {value ?? <Dash />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Dash() {
  return <span className="text-text-subtlest">–</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-4 text-center text-sm italic text-text-subtlest">{children}</div>;
}

/** A thin bar split into stage segments, each sized by its share and in its own color. */
export function StageBar({
  segments,
}: {
  segments: readonly { key: string; color: string; share: number }[];
}) {
  return (
    <div className="flex w-full mb-3" aria-hidden>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className="flex min-w-1 px-px"
          style={{ width: `${segment.share * 100}%` }}
        >
          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: segment.color }} />
        </div>
      ))}
    </div>
  );
}

export const tableClass = "w-full table-fixed text-left text-sm border-separate border-spacing-0";
export const cellClass = "px-2 py-1.5 align-top border-b border-b-surface-highlight";
