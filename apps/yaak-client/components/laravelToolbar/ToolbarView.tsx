import { CountBadge } from "../core/CountBadge";
import type { TabItem } from "../core/Tabs/Tabs";
import { TabContent, Tabs } from "../core/Tabs/Tabs";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { ModelsPanel } from "./ModelsPanel";
import { hasQueryIssues, modelCount, queries } from "./model";
import { QueriesPanel } from "./QueriesPanel";
import { RequestPanel } from "./RequestPanel";
import { TimelinePanel } from "./TimelinePanel";
import { ToolbarSummary } from "./ToolbarSummary";
import type { ToolbarData, ToolbarHistoryRow } from "./types";

const TAB_TIMELINE = "timeline";
const TAB_QUERIES = "queries";
const TAB_MODELS = "models";
const TAB_REQUEST = "request";
const TAB_ENVIRONMENT = "environment";

export function ToolbarView({
  data,
  row,
  storageKey,
}: {
  data: ToolbarData;
  row?: ToolbarHistoryRow | null;
  storageKey: string;
}) {
  const queryCount = queries(data).length;
  const models = modelCount(data);
  const tabs: TabItem[] = [
    { value: TAB_TIMELINE, label: "Timeline" },
    {
      value: TAB_QUERIES,
      label: "Queries",
      rightSlot: (
        <CountBadge count={queryCount} color={hasQueryIssues(data) ? "warning" : undefined} />
      ),
    },
    { value: TAB_MODELS, label: "Models", rightSlot: <CountBadge count={models} /> },
    { value: TAB_REQUEST, label: "Request" },
    { value: TAB_ENVIRONMENT, label: "Environment" },
  ];

  return (
    <div className="h-full grid grid-rows-[auto_minmax(0,1fr)]">
      <ToolbarSummary data={data} row={row} />
      <Tabs
        tabs={tabs}
        label="Laravel Toolbar"
        className="min-h-0"
        tabListClassName="-mb-1.5"
        defaultValue={TAB_TIMELINE}
        storageKey="laravel_toolbar_tabs"
        activeTabKey={storageKey}
      >
        <TabContent value={TAB_TIMELINE}>
          <TimelinePanel data={data} />
        </TabContent>
        <TabContent value={TAB_QUERIES}>
          <QueriesPanel data={data} />
        </TabContent>
        <TabContent value={TAB_MODELS}>
          <ModelsPanel data={data} />
        </TabContent>
        <TabContent value={TAB_REQUEST}>
          <RequestPanel data={data} storageKey={storageKey} />
        </TabContent>
        <TabContent value={TAB_ENVIRONMENT}>
          <EnvironmentPanel data={data} />
        </TabContent>
      </Tabs>
    </div>
  );
}
