import { useQuery } from "@tanstack/react-query";
import type { HttpResponse } from "@yaakapp-internal/models";
import { Banner, HStack, LoadingIcon } from "@yaakapp-internal/ui";
import { useMemo } from "react";
import { useActiveEnvironment } from "../../hooks/useActiveEnvironment";
import { EmptyStateText } from "../EmptyStateText";
import { ErrorBoundary } from "../ErrorBoundary";
import { ToolbarSummary } from "./ToolbarSummary";
import { ToolbarView } from "./ToolbarView";
import { readToolbarHeader } from "./decode";
import { fetchToolbarDetails } from "./fetchToolbarDetails";

export { hasToolbarHeader } from "./decode";

/** The Toolbar tab of the HTTP response pane: Laravel Toolbar data for one response. */
export function LaravelToolbar({ response }: { response: HttpResponse }) {
  return (
    <ErrorBoundary name="Laravel Toolbar">
      <Inner key={response.id} response={response} />
    </ErrorBoundary>
  );
}

function Inner({ response }: { response: HttpResponse }) {
  const header = useMemo(() => readToolbarHeader(response.headers), [response.headers]);
  const environment = useActiveEnvironment();
  const summaryId = header?.kind === "summary" ? header.requestId : null;
  const details = useQuery({
    queryKey: ["laravel_toolbar_details", response.id, summaryId],
    enabled: summaryId != null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: () => fetchToolbarDetails(response, summaryId ?? "", environment?.id ?? null),
  });

  if (header == null) {
    return <EmptyStateText>This response has no Laravel Toolbar data</EmptyStateText>;
  }
  if (header.kind === "invalid") {
    return (
      <Banner color="danger" className="text-sm">
        {header.error}
      </Banner>
    );
  }

  const storageKey = `laravel_toolbar.${response.requestId}`;
  if (header.kind === "full") {
    return <ToolbarView data={header.data} storageKey={storageKey} />;
  }
  if (details.data) {
    return <ToolbarView data={details.data} row={header.row} storageKey={storageKey} />;
  }
  if (details.error) {
    return (
      <div className="flex flex-col gap-2">
        {header.row && <ToolbarSummary data={{}} row={header.row} />}
        <Banner color="danger" className="text-sm">
          The payload was too large for the header, and loading it failed: {String(details.error)}
        </Banner>
      </div>
    );
  }
  return (
    <EmptyStateText>
      <HStack space={2}>
        <LoadingIcon className="text-text-subtlest" />
        Loading toolbar data…
      </HStack>
    </EmptyStateText>
  );
}
