import type { ReactNode } from "react";
import { errorReportingLabel, formatBytes, formatUptime, iniSwitch, list, phpLimit } from "./model";
import { InfoRows, Pill, Section, Stat, StatStrip } from "./parts";
import type { ToolbarData } from "./types";

type Php = NonNullable<ToolbarData["php"]>;
type Fpm = NonNullable<Php["fpm"]>;

function isDebug(value: ToolbarData["laravel"]): boolean {
  const debug = value?.debug;
  return debug === true || debug === "1" || debug === "true";
}

function text(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function Columns({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-x-6">{children}</div>
  );
}

function LaravelSection({ data }: { data: ToolbarData }) {
  const laravel = data.laravel;
  return (
    <Section title="Laravel">
      <StatStrip>
        <Stat label="Laravel" value={text(laravel?.version) ?? "–"} />
        <Stat label="Environment" value={text(laravel?.environment) ?? "–"} hint="APP_ENV" />
        <Stat
          label="Debug"
          value={isDebug(laravel) ? "On" : "Off"}
          hint="APP_DEBUG"
          tone={isDebug(laravel) ? "warning" : "default"}
        />
        <Stat label="Inertia" value={data.inertia?.version ? "Yes" : "–"} hint="Asset version" />
      </StatStrip>
      <InfoRows
        rows={[
          ["Timezone", text(laravel?.timezone)],
          ["Locale", text(laravel?.locale)],
          ["Host", text(laravel?.host)],
          ...(data.inertia?.version
            ? ([["Inertia version", text(data.inertia.version)]] as const)
            : []),
        ]}
      />
    </Section>
  );
}

function PhpSection({ php }: { php: Php }) {
  const settings = php.settings ?? {};
  const setting = (name: string) => text(settings[name]);
  const opcache = php.opcache;
  const opcacheTotal =
    typeof opcache?.memory_used === "number" && typeof opcache.memory_free === "number"
      ? opcache.memory_used + opcache.memory_free
      : null;
  const extensions = list(php.extensions).filter((e): e is string => typeof e === "string");
  return (
    <Section title="PHP">
      <StatStrip>
        <Stat label="PHP" value={text(php.version) ?? "–"} hint={text(php.sapi) ?? "Runtime"} />
        <Stat label="Memory limit" value={phpLimit(php.memory_limit)} hint="Per request" />
        <Stat
          label="Max execution"
          value={phpLimit(php.max_execution_time, "s")}
          hint="Per request"
        />
        <Stat
          label="OPcache"
          value={
            opcache?.enabled
              ? typeof opcache.hit_rate === "number"
                ? `${opcache.hit_rate.toFixed(1)}%`
                : "On"
              : opcache
                ? "Off"
                : "–"
          }
          hint={opcache?.enabled ? "Hit rate" : "Not loaded"}
          tone={opcache && !opcache.enabled ? "warning" : "default"}
        />
      </StatStrip>
      <Columns>
        <Section title="Requests and uploads">
          <InfoRows
            rows={[
              ["Post max size", setting("post_max_size")],
              ["Upload max filesize", setting("upload_max_filesize")],
              ["Max file uploads", setting("max_file_uploads")],
              ["Max input vars", setting("max_input_vars")],
              ["Max input time", phpLimit(settings.max_input_time, "s")],
              [
                "Socket timeout",
                settings.default_socket_timeout ? `${settings.default_socket_timeout}s` : null,
              ],
            ]}
          />
        </Section>
        <Section title="Errors and OPcache">
          <InfoRows
            rows={[
              ["Display errors", iniSwitch(settings.display_errors)],
              ["Error reporting", errorReportingLabel(settings.error_reporting, php.version)],
              ["Log errors", iniSwitch(settings.log_errors)],
              [
                "OPcache memory",
                typeof opcache?.memory_used === "number" && opcacheTotal != null
                  ? `${formatBytes(opcache.memory_used)} of ${formatBytes(opcacheTotal)}`
                  : null,
              ],
              [
                "Cached scripts",
                typeof opcache?.cached_scripts === "number" ? opcache.cached_scripts : null,
              ],
              ["Validate timestamps", iniSwitch(settings["opcache.validate_timestamps"])],
              ["JIT", setting("opcache.jit")],
            ]}
          />
        </Section>
      </Columns>
      {extensions.length > 0 && (
        <Section title="Extensions" aside={`${extensions.length} loaded`}>
          <div className="flex flex-wrap gap-1">
            {extensions.map((extension) => (
              <Pill key={extension} mono>
                {extension}
              </Pill>
            ))}
          </div>
        </Section>
      )}
    </Section>
  );
}

function FpmSection({ fpm }: { fpm: Fpm }) {
  const pool = fpm.settings ?? {};
  const maxChildren = text(pool["pm.max_children"]);
  const reached = typeof fpm.max_children_reached === "number" ? fpm.max_children_reached : 0;
  const listenQueue = typeof fpm.listen_queue === "number" ? fpm.listen_queue : 0;
  // Settings the pool file leaves out do not apply to its process manager, so they stay out.
  const poolRows = (
    [
      ["Name", text(fpm.pool)],
      ["Process manager", text(pool.pm) ?? text(fpm.process_manager)],
      ["Max children", maxChildren],
      ["Start servers", text(pool["pm.start_servers"])],
      [
        "Spare servers",
        pool["pm.min_spare_servers"] || pool["pm.max_spare_servers"]
          ? `${pool["pm.min_spare_servers"] ?? "–"} to ${pool["pm.max_spare_servers"] ?? "–"}`
          : null,
      ],
      ["Max requests", text(pool["pm.max_requests"])],
      ["Idle timeout", text(pool["pm.process_idle_timeout"])],
      ["Terminate timeout", text(pool.request_terminate_timeout)],
      ["Slowlog timeout", text(pool.request_slowlog_timeout)],
      ["Listen", text(pool.listen)],
    ] as const
  ).filter(([key, value]) => value != null || key === "Name" || key === "Process manager");
  return (
    <Section title="PHP-FPM">
      <StatStrip>
        <Stat
          label="Active workers"
          value={text(fpm.active_processes) ?? "–"}
          hint={maxChildren ? `of ${maxChildren} max children` : "Now"}
        />
        <Stat label="Idle workers" value={text(fpm.idle_processes) ?? "–"} hint="Now" />
        <Stat
          label="Listen queue"
          value={text(fpm.listen_queue) ?? "–"}
          hint={`Peak ${text(fpm.max_listen_queue) ?? "–"}`}
          tone={listenQueue > 0 ? "warning" : "default"}
        />
        <Stat
          label="Max children reached"
          value={reached}
          hint="Since start"
          tone={reached > 0 ? "warning" : "default"}
        />
      </StatStrip>
      <Columns>
        <Section title="Pool">
          <InfoRows rows={poolRows} />
        </Section>
        <Section title="Since start">
          <InfoRows
            rows={[
              [
                "Uptime",
                formatUptime(typeof fpm.start_since === "number" ? fpm.start_since : null),
              ],
              ["Accepted connections", text(fpm.accepted_conn)],
              ["Max active workers", text(fpm.max_active_processes)],
              ["Total workers", text(fpm.total_processes)],
              ["Slow requests", text(fpm.slow_requests)],
            ]}
          />
        </Section>
      </Columns>
    </Section>
  );
}

export function EnvironmentPanel({ data }: { data: ToolbarData }) {
  const php = data.php;
  const fpm = php?.fpm ?? null;
  return (
    <div className="h-full overflow-auto pb-3 pr-0.5">
      <LaravelSection data={data} />
      {php ? <PhpSection php={php} /> : null}
      {fpm ? <FpmSection fpm={fpm} /> : null}
    </div>
  );
}
