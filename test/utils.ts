import { vi } from "vitest";
import type { Context, Handler } from "aws-lambda";

import type { ServerBuild } from "react-router";

let currentRRHandler: RRHandler | null = null;
export function setReactRouterHandler(fn: RRHandler) {
  currentRRHandler = fn;
}
vi.mock("react-router", () => {
  return {
    createRequestHandler: () => {
      if (!currentRRHandler) throw new Error("React Router handler not set");
      return currentRRHandler;
    },
  };
});

type ReactRouterAws = typeof import("../src");
type GatewayHandlers = Pick<
  ReactRouterAws,
  | "createALBRequestHandler"
  | "createAPIGatewayV1RequestHandler"
  | "createAPIGatewayV2RequestHandler"
  | "createFunctionURLRequestHandler"
  | "createFunctionURLStreamingRequestHandler"
>;

type RRHandler = (request: Request) => Response | Promise<Response>;

export async function createHandlerWithRRMock<T extends keyof GatewayHandlers>(
  gatewayHandler: T,
  handler: RRHandler,
): Promise<GatewayHandlers[T]> {
  setReactRouterHandler(handler);
  const handlerFactory = (await import("../src"))[gatewayHandler] as any;
  return handlerFactory({ build: {} as unknown as ServerBuild });
}

export async function invokeHandlerWithRRMock<T extends keyof GatewayHandlers>(
  gatewayHandler: T,
  rrHandler: RRHandler,
  event: Parameters<ReturnType<GatewayHandlers[T]>>[0],
) {
  const handler = await createHandlerWithRRMock(gatewayHandler, rrHandler);
  return invokeHandler(handler as any, event);
}

export async function invokeHandler<E, R>(handler: Handler<E, R>, event: E): Promise<R> {
  return (await handler(event, {} as unknown as Context, () => {
    throw new Error("Callback not supported");
  })) as R;
}

export function htmlResponse(setCookie?: string) {
  const headers = new Headers({ "Content-Type": "text/html" });
  if (setCookie) {
    headers.append("Set-Cookie", setCookie);
  }
  return new Response("<html>ok</html>", { status: 200, headers });
}

export function redirectResponse(setCookie?: string) {
  const headers = new Headers({ Location: "https://example.com/next" });
  if (setCookie) {
    headers.append("Set-Cookie", setCookie);
  }
  return new Response(null, { status: 302, headers });
}
