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

import type { ReactRouterAdapter } from "./adapters";
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
   * Derive the request URL host from the API Gateway request context
   * (`event.requestContext.domainName`) instead of the client-supplied
   * `x-forwarded-host` header (falling back to the `host` header in both cases).
   *
   * The request URL host is what React Router uses for its built-in cross-origin
   * (CSRF) check on action requests, so preferring the AWS-provided domain name
   * avoids trusting a client-influenced header.
   *
   * Has no effect for the ALB adapter, whose events carry no request-context
   * domain name.
   *
   * @default false
   *
   * @remarks
   * This mirrors the `@react-router/architect` adapter. To align with React
   * Router, this option will default to `true` in the next major version, after
   * which the flag will be removed and the request-context domain name will
   * always be used.
   */
  useRequestContextDomainName?: boolean;
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
  {
    build,
    getLoadContext,
    mode = process.env.NODE_ENV,
    useRequestContextDomainName = false,
  }: CreateRequestHandlerArgs<E>,
) {
  const handleRequest = createReactRouterRequestHandler(build, mode);

  return awsAdapter.wrapHandler(async (event, res) => {
    let request: Request;

    try {
      request = awsAdapter.createReactRouterRequest(event, useRequestContextDomainName);
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
