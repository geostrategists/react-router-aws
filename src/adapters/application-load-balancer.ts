import type { ALBEvent, ALBEventHeaders, ALBResult } from "aws-lambda";

import { readableStreamToString } from "@react-router/node";
import { URLSearchParams } from "url";

import { isBinaryType } from "../binaryTypes";

import { ReactRouterAdapter } from "./index";

function createReactRouterRequestALB(event: ALBEvent): Request {
  const headers = event?.headers || {};
  const host = headers["x-forwarded-host"] || headers.Host;
  const scheme = headers["x-forwarded-proto"] || "http";

  const rawQueryString = new URLSearchParams(event.queryStringParameters as Record<string, string>).toString();
  const search = rawQueryString.length > 0 ? `?${rawQueryString}` : "";
  const url = new URL(event.path + search, `${scheme}://${host}`);

  const isFormData = headers["content-type"]?.includes("multipart/form-data");

  // Note: No current way to abort these for AWS, but our router expects
  // requests to contain a signal, so it can detect aborted requests
  const controller = new AbortController();

  return new Request(url.href, {
    method: event.httpMethod,
    headers: createReactRouterHeadersALB(headers),
    signal: controller.signal,
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "base64").toString()
        : event.body || undefined,
  });
}

function createReactRouterHeadersALB(requestHeaders: ALBEventHeaders): Headers {
  const headers = new Headers();

  for (const [header, value] of Object.entries(requestHeaders)) {
    if (value) {
      headers.append(header, value);
    }
  }

  return headers;
}

async function sendReactRouterResponseALB(nodeResponse: Response): Promise<ALBResult> {
  const contentType = nodeResponse.headers.get("Content-Type");
  const isBase64Encoded = isBinaryType(contentType);
  let body: string | undefined;

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
      body = await nodeResponse.text();
    }
  }

  return {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers.entries()),
    body: body || "",
    isBase64Encoded,
  };
}

export type ApplicationLoadBalancerAdapter = ReactRouterAdapter<ALBEvent, ALBResult>;

export const applicationLoadBalancerAdapter: ApplicationLoadBalancerAdapter = {
  createReactRouterRequest: createReactRouterRequestALB,
  sendReactRouterResponse: sendReactRouterResponseALB,
};
