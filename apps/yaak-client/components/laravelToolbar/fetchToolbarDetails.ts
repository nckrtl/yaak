import type { HttpRequest, HttpResponse } from "@yaakapp-internal/models";
import { getModel } from "@yaakapp-internal/models";
import { sendEphemeralRequest } from "../../lib/sendEphemeralRequest";
import { parseToolbarDetailsBody, toolbarDetailsUrl } from "./decode";
import type { ToolbarData } from "./types";

/**
 * Loads a summarized request's full payload from `<origin>/_toolbar/requests/{id}`. It goes
 * through the engine like any other send (no CORS), based on the original request so it keeps
 * its certificate, redirect and timeout settings, and with the active cookie jar.
 */
export async function fetchToolbarDetails(
  response: HttpResponse,
  requestId: string,
  environmentId: string | null,
): Promise<ToolbarData> {
  const url = toolbarDetailsUrl(response.url, requestId);
  if (url == null) {
    throw new Error(`Cannot load toolbar details: no origin in ${response.url}`);
  }
  const base = getModel("http_request", response.requestId);
  if (base == null) {
    throw new Error("Cannot load toolbar details: the request no longer exists");
  }
  const request: HttpRequest = {
    ...base,
    method: "GET",
    url,
    urlParameters: [],
    body: {},
    bodyType: null,
    headers: [
      { enabled: true, name: "Accept", value: "application/json" },
      { enabled: true, name: "X-Laravel-Toolbar-Internal", value: "true" },
    ],
  };
  const { response: detailsResponse, body } = await sendEphemeralRequest(request, environmentId);
  if (detailsResponse.error) {
    throw new Error(detailsResponse.error);
  }
  if (detailsResponse.status < 200 || detailsResponse.status >= 300) {
    throw new Error(`${url} answered with status ${detailsResponse.status}`);
  }
  const data = parseToolbarDetailsBody(body);
  if (data == null) {
    throw new Error(`${url} did not return a toolbar payload`);
  }
  return data;
}
