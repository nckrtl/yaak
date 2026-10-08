import { Icon } from "@yaakapp-internal/ui";
import classNames from "classnames";
import { type ReactNode, useState } from "react";
import { CountBadge } from "../core/CountBadge";
import { DetailsBanner } from "../core/DetailsBanner";
import {
  headerRows,
  list,
  type PropBadge,
  type PropRow,
  propRows,
  routeUri,
  shortLocation,
} from "./model";
import { cellClass, Dash, Empty, InfoRows, Pill, type Tone, tableClass } from "./parts";
import { SortHeader, useTableSort } from "./SortHeader";
import { sortTableRows } from "./tableSort";
import type { ToolbarCookie, ToolbarData } from "./types";

const BADGE_TONE: Record<PropBadge, Tone> = {
  Shared: "info",
  Always: "success",
  Deferred: "warning",
  Optional: "default",
  Merge: "default",
  Scroll: "default",
  Once: "default",
};

function Scalar({ value }: { value: unknown }) {
  if (typeof value === "string")
    return <span className="text-success">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="text-info">{value}</span>;
  if (typeof value === "boolean") return <span className="text-warning">{String(value)}</span>;
  if (value === undefined) return <span className="text-text-subtlest italic">not loaded</span>;
  return <span className="text-text-subtlest">null</span>;
}

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === "object" && value !== null;
}

/** One prop in the tree. Objects and arrays fold open with a chevron. */
function PropNode({
  name,
  value,
  depth,
  aside,
}: {
  name: string;
  value: unknown;
  depth: number;
  aside?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const branch = isBranch(value);
  const entries = branch ? Object.entries(value) : [];
  const count = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
  return (
    <div
      className={classNames(depth === 0 && "border-b border-b-surface-highlight last:border-b-0")}
    >
      <div className="flex items-center gap-1.5 py-1 font-mono text-editor">
        {branch && entries.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 outline-none hover:text-text focus-visible:text-text"
          >
            <Icon
              icon="chevron_right"
              size="sm"
              className={classNames("text-text-subtle transition-transform", open && "rotate-90")}
            />
            <span>{name}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <span className="w-4 shrink-0" />
            <span>
              {name}
              {!branch && <span className="text-text-subtlest">:</span>}
            </span>
          </span>
        )}
        <span className="min-w-0 truncate select-text cursor-text">
          {branch ? <span className="text-text-subtlest">{count}</span> : <Scalar value={value} />}
        </span>
        {aside != null && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5">{aside}</span>
        )}
      </div>
      {branch && open && (
        <div className="mb-1 ml-2 border-l border-l-surface-highlight pl-3">
          {entries.map(([key, child]) => (
            <PropNode key={key} name={key} value={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropAside({ prop }: { prop: PropRow }) {
  const { source } = prop;
  return (
    <>
      {prop.badges.map((badge) => (
        <Pill key={badge} tone={BADGE_TONE[badge]}>
          {badge}
        </Pill>
      ))}
      {source && typeof source.file === "string" && (
        <span
          className="font-mono text-xs text-text-subtlest"
          title={`${source.file}:${source.line}`}
        >
          {shortLocation(source.file, source.line)}
        </span>
      )}
    </>
  );
}

function responseKind(data: ToolbarData): string {
  const contentType =
    typeof data.response?.content_type === "string" ? data.response.content_type : "";
  if (data.request?.is_inertia) return "Inertia";
  if (contentType.includes("json")) return "JSON";
  if (contentType.includes("html")) return "HTML";
  return contentType || "–";
}

function CookiesTable({ cookies }: { cookies: readonly ToolbarCookie[] }) {
  const sorting = useTableSort();
  const rows = sortTableRows(cookies, sorting.sort, (cookie, column) => {
    if (column === "name") return cookie.name;
    if (column === "value") return cookie.value;
    if (column === "path") return cookie.path ?? "/";
    if (column === "sameSite") return cookie.same_site;
    return [cookie.secure ? "Secure" : "", cookie.http_only ? "HttpOnly" : ""]
      .filter(Boolean)
      .join(" ");
  });
  return (
    <table className={tableClass}>
      <colgroup>
        <col className="w-[24%]" />
        <col />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[20%]" />
      </colgroup>
      <thead>
        <tr>
          <SortHeader column="name" label="Name" {...sorting} />
          <SortHeader column="value" label="Value" {...sorting} />
          <SortHeader column="path" label="Path" {...sorting} />
          <SortHeader column="sameSite" label="SameSite" {...sorting} />
          <SortHeader column="flags" label="Flags" {...sorting} />
        </tr>
      </thead>
      <tbody>
        {rows.map((cookie, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- names can repeat across paths
          <tr key={`${i}:${cookie.name}`}>
            <td className={classNames(cellClass, "truncate font-mono")}>{String(cookie.name)}</td>
            <td
              className={classNames(cellClass, "truncate font-mono text-text-subtle")}
              title={String(cookie.value ?? "")}
            >
              {String(cookie.value ?? "")}
            </td>
            <td className={classNames(cellClass, "font-mono text-text-subtle")}>
              {cookie.path ?? "/"}
            </td>
            <td className={classNames(cellClass, "text-text-subtle")}>{cookie.same_site ?? "–"}</td>
            <td className={cellClass}>
              <div className="flex gap-1">
                {cookie.secure && <Pill>Secure</Pill>}
                {cookie.http_only && <Pill>HttpOnly</Pill>}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RequestPanel({ data, storageKey }: { data: ToolbarData; storageKey: string }) {
  const request = data.request;
  const props = propRows(data);
  const middleware = list(request?.middleware);
  const cookies = list(data.response?.cookies);
  const requestHeaders = headerRows(request?.headers);
  const responseHeaders = headerRows(data.response?.headers);

  return (
    <div className="h-full overflow-auto pb-3 pr-0.5 flex flex-col gap-y-3">
      <DetailsBanner defaultOpen storageKey={`${storageKey}.route`} summary={<h2>Route</h2>}>
        <InfoRows
          rows={[
            ["Name", request?.route_name && request.route_name !== "-" ? request.route_name : null],
            ["URI", routeUri(data)],
            ["Action", request?.controller_action ?? null],
            ["Component", request?.view_name ?? null],
            ["Response", responseKind(data), "sans"],
            ...(data.response?.redirect_to
              ? ([["Redirect to", data.response.redirect_to]] as const)
              : []),
            ["Client IP", request?.ip_address ?? null],
            [
              "Middleware",
              middleware.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1">
                  {middleware.map((item, index) => (
                    // oxlint-disable-next-line react/no-array-index-key -- middleware may repeat
                    <span key={`${index}:${item.class}`} className="inline-flex items-center gap-1">
                      {index > 0 && <span className="text-text-subtlest">→</span>}
                      <span title={String(item.class)}>{String(item.class).split("\\").pop()}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <Dash />
              ),
            ],
          ]}
        />
      </DetailsBanner>

      {(props.length > 0 || request?.is_inertia) && (
        <DetailsBanner
          defaultOpen
          storageKey={`${storageKey}.props`}
          summary={
            <h2 className="flex items-center">
              {request?.is_inertia ? "Inertia props" : "View data"}
              <CountBadge showZero count={props.length} />
            </h2>
          }
        >
          {props.length === 0 ? (
            <Empty>No page props in this request</Empty>
          ) : (
            props.map((prop) => (
              <PropNode
                key={prop.name}
                name={prop.name}
                value={prop.loaded ? prop.value : undefined}
                depth={0}
                aside={<PropAside prop={prop} />}
              />
            ))
          )}
        </DetailsBanner>
      )}

      <DetailsBanner
        storageKey={`${storageKey}.request_headers`}
        summary={
          <h2 className="flex items-center">
            Request headers <CountBadge showZero count={requestHeaders.length} />
          </h2>
        }
      >
        <InfoRows rows={requestHeaders} />
      </DetailsBanner>

      <DetailsBanner
        storageKey={`${storageKey}.response_headers`}
        summary={
          <h2 className="flex items-center">
            Response headers <CountBadge showZero count={responseHeaders.length} />
          </h2>
        }
      >
        <InfoRows rows={responseHeaders} />
      </DetailsBanner>

      <DetailsBanner
        storageKey={`${storageKey}.cookies`}
        summary={
          <h2 className="flex items-center">
            Cookies set <CountBadge showZero count={cookies.length} />
          </h2>
        }
      >
        {cookies.length === 0 ? (
          <Empty>The response set no cookies</Empty>
        ) : (
          <CookiesTable cookies={cookies} />
        )}
      </DetailsBanner>
    </div>
  );
}
