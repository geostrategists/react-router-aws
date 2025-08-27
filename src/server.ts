import {
  AppLoadContext,
  createRequestHandler as createReactRouterRequestHandler,
  ServerBuild,
  UNSAFE_MiddlewareEnabled as MiddlewareEnabled,
  unstable_InitialContext,
} from "react-router";

import { ReactRouterAdapter } from "./adapters";
import {
  type ALBEvent,
  ALBHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandler,
  APIGatewayProxyHandlerV2,
  LambdaFunctionURLEvent,
  LambdaFunctionURLHandler,
} from "aws-lambda";
import { apiGatewayV2Adapter } from "./adapters/api-gateway-v2";
import { apiGatewayV1Adapter } from "./adapters/api-gateway-v1";
import { applicationLoadBalancerAdapter } from "./adapters/application-load-balancer";
import { functionUrlStreamingAdapter } from "./adapters/function-url-streaming";
import { StreamifyHandler } from "aws-lambda/handler";

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
) => MiddlewareEnabled extends true ? MaybePromise<unstable_InitialContext> : MaybePromise<AppLoadContext>;

export type CreateRequestHandlerArgs<T> = {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction<T>;
  mode?: string;
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
  { build, getLoadContext, mode = process.env.NODE_ENV }: CreateRequestHandlerArgs<E>,
) {
  const handleRequest = createReactRouterRequestHandler(build, mode);

  return awsAdapter.wrapHandler(async (event, res) => {
    let request: Request;

    try {
      request = awsAdapter.createReactRouterRequest(event);
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
