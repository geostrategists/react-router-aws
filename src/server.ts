import type {
  ALBEvent,
  ALBHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandler,
  APIGatewayProxyHandlerV2,
  LambdaFunctionURLEvent,
  LambdaFunctionURLHandler,
} from "aws-lambda";
import type { StreamifyHandler } from "aws-lambda/handler";
import {
  type AppLoadContext,
  createRequestHandler as createReactRouterRequestHandler,
  type RouterContextProvider,
  type ServerBuild,
  type UNSAFE_MiddlewareEnabled as MiddlewareEnabled,
} from "react-router";

import type { GetHostFunction, ReactRouterAdapter } from "./adapters";
import { apiGatewayV1Adapter } from "./adapters/api-gateway-v1";
import { apiGatewayV2Adapter } from "./adapters/api-gateway-v2";
import { applicationLoadBalancerAdapter } from "./adapters/application-load-balancer";
import { functionUrlStreamingAdapter } from "./adapters/function-url-streaming";

type MaybePromise<T> = T | Promise<T>;

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction<E> = (
  event: E,
) => MiddlewareEnabled extends true ? MaybePromise<RouterContextProvider> : MaybePromise<AppLoadContext>;

export type CreateRequestHandlerArgs<T> = {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction<T>;
  mode?: string;
  /**
   * Override how the host for the request URL is derived from the Lambda event.
   *
   * React Router uses the request URL host (`new URL(request.url).host`) for its
   * built-in cross-origin (CSRF) check on action requests, comparing it against
   * the incoming `Origin` header. The returned value is sanitized (invalid
   * characters stripped, port validated) before use.
   *
   * Return `undefined`/`null` to fall back to the default: the
   * `x-forwarded-host` header (falling back to the `host`/`Host` header).
   *
   * Use this when the default forwarded host is not the host the browser sees.
   * For example, a Lambda Function URL behind CloudFront cannot use its
   * request-context domain name (always the internal `*.lambda-url` host) — the
   * trusted viewer host is forwarded in a header such as `cloudfront-viewer-host`:
   *
   * ```ts
   * createFunctionURLRequestHandler({
   *   build,
   *   getHost: (event) => event.headers["cloudfront-viewer-host"],
   * });
   * ```
   *
   * @remarks
   * The default currently uses the `x-forwarded-host` header. To align with the
   * upstream `@react-router/architect` adapter, the default will change to the
   * API Gateway request context domain name (`event.requestContext.domainName`)
   * in the next major version. Setups where that host is not the browser-facing
   * host (e.g. Function URLs behind CloudFront) should set `getHost` explicitly.
   */
  getHost?: GetHostFunction<T>;
};

/**
 * Returns a request handler for AWS API Gateway V1
 *
 */
/**
 * Returns a request handler for AWS API Gateway V1 events.
 *
 * @param options - The handler options, including the React Router server build,
 *   optional getLoadContext function, and mode string.
 * @returns An AWS API Gateway V1 handler compatible with APIGatewayProxyHandler.
 */
export function createAPIGatewayV1RequestHandler(
  options: CreateRequestHandlerArgs<APIGatewayProxyEvent>,
): APIGatewayProxyHandler {
  return createRequestHandlerForAdapter(apiGatewayV1Adapter, options);
}

/**
 * Returns a request handler for AWS API Gateway V2 events.
 *
 * @param options - The handler options, including the React Router server build,
 *   optional getLoadContext function, and mode string.
 * @returns An AWS API Gateway V2 handler compatible with APIGatewayProxyHandlerV2.
 */
export function createAPIGatewayV2RequestHandler(
  options: CreateRequestHandlerArgs<APIGatewayProxyEventV2>,
): APIGatewayProxyHandlerV2 {
  return createRequestHandlerForAdapter(apiGatewayV2Adapter, options);
}

/**
 * Returns a request handler for AWS Application Load Balancer events.
 *
 * @param options - The handler options, including the React Router server build,
 *   optional getLoadContext function, and mode string.
 * @returns An AWS ALB handler compatible with ALBHandler.
 */
export function createALBRequestHandler(options: CreateRequestHandlerArgs<ALBEvent>): ALBHandler {
  return createRequestHandlerForAdapter(applicationLoadBalancerAdapter, options);
}

/**
 * Returns a request handler for AWS Lambda Function URL events (invoke mode BUFFERED).
 *
 * @param options - The handler options, including the React Router server build,
 *   optional getLoadContext function, and mode string.
 * @returns An AWS Lambda Function URL handler compatible with Lambda Function URLs with InvokeMode BUFFERED.
 */
export function createFunctionURLRequestHandler(
  options: CreateRequestHandlerArgs<LambdaFunctionURLEvent>,
): LambdaFunctionURLHandler {
  return createRequestHandlerForAdapter(apiGatewayV2Adapter, options);
}

/**
 * Returns a request handler for AWS Lambda Function URL events (invoke mode RESPONSE_STREAM).
 *
 * @param options - The handler options, including the React Router server build,
 *   optional getLoadContext function, and mode string.
 * @returns A streaming AWS Lambda Function URL handler compatible with Lambda Function URLs with InvokeMode RESPONSE_STREAM.
 */
export function createFunctionURLStreamingRequestHandler(
  options: CreateRequestHandlerArgs<LambdaFunctionURLEvent>,
): StreamifyHandler<LambdaFunctionURLEvent, void> {
  return createRequestHandlerForAdapter(functionUrlStreamingAdapter, options);
}

function createRequestHandlerForAdapter<E, Ret, Res, H>(
  awsAdapter: ReactRouterAdapter<E, Ret, Res, H>,
  { build, getLoadContext, mode = process.env.NODE_ENV, getHost }: CreateRequestHandlerArgs<E>,
) {
  const handleRequest = createReactRouterRequestHandler(build, mode);

  return awsAdapter.wrapHandler(async (event, res) => {
    let request: Request;

    try {
      request = awsAdapter.createReactRouterRequest(event, getHost);
    } catch (e: unknown) {
      return await awsAdapter.sendReactRouterResponse(
        new Response(`Bad Request: ${e instanceof Error ? e.message : e}`, { status: 400 }),
        res,
      );
    }

    const loadContext = await getLoadContext?.(event);

    const response = await handleRequest(request, loadContext);

    return await awsAdapter.sendReactRouterResponse(response, res);
  });
}
