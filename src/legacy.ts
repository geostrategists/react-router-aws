/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiGatewayV1Adapter } from "./adapters/api-gateway-v1";
import type { ApiGatewayV2Adapter } from "./adapters/api-gateway-v2";
import type { ApplicationLoadBalancerAdapter } from "./adapters/application-load-balancer";
import type { FunctionUrlStreamingAdapter } from "./adapters/function-url-streaming";
import type { CreateRequestHandlerArgs } from "./server";
import type { ReactRouterAdapter } from "./adapters";

import {
  createALBRequestHandler,
  createAPIGatewayV1RequestHandler,
  createAPIGatewayV2RequestHandler,
  createFunctionURLRequestHandler,
  createFunctionURLStreamingRequestHandler,
} from "./server";
import { ALBEvent, APIGatewayProxyEvent, APIGatewayProxyEventV2, LambdaFunctionURLEvent } from "aws-lambda";

export enum AWSProxy {
  APIGatewayV1 = "APIGatewayV1",
  APIGatewayV2 = "APIGatewayV2",
  ALB = "ALB",
  FunctionURL = "FunctionURL",
  FunctionURLStreaming = "FunctionURLStreaming",
}

export type InferAdapter<T extends AWSProxy> = T extends AWSProxy.APIGatewayV1
  ? ApiGatewayV1Adapter
  : T extends AWSProxy.APIGatewayV2 | AWSProxy.FunctionURL
    ? ApiGatewayV2Adapter
    : T extends AWSProxy.ALB
      ? ApplicationLoadBalancerAdapter
      : T extends AWSProxy.FunctionURLStreaming
        ? FunctionUrlStreamingAdapter
        : never;

type InferEventType<T extends AWSProxy> =
  InferAdapter<T> extends ReactRouterAdapter<infer E, any, any, any> ? E : never;
type InferHandlerType<T extends AWSProxy> =
  InferAdapter<T> extends ReactRouterAdapter<any, any, any, infer H> ? H : never;

/**
 * Returns a request handler for AWS that serves the response using React Router.
 *
 * @deprecated Use one of the gateway-specific create*RequestHandler methods instead for better tree-shaking.
 *  - `createAPIGatewayV1RequestHandler`
 *  - `createAPIGatewayV2RequestHandler`
 *  - `createALBRequestHandler`
 *  - `createFunctionURLRequestHandler`
 *  - `createFunctionURLStreamingRequestHandler`
 */
export function createRequestHandler<T extends AWSProxy>(
  options: CreateRequestHandlerArgs<InferEventType<T>> & {
    awsProxy?: T;
  },
): InferHandlerType<T> {
  const { awsProxy = AWSProxy.APIGatewayV2 as T, ...opts } = options;
  switch (awsProxy) {
    case AWSProxy.APIGatewayV1:
      return createAPIGatewayV1RequestHandler(
        opts as CreateRequestHandlerArgs<APIGatewayProxyEvent>,
      ) as InferHandlerType<T>;
    case AWSProxy.APIGatewayV2:
      return createAPIGatewayV2RequestHandler(
        opts as CreateRequestHandlerArgs<APIGatewayProxyEventV2>,
      ) as InferHandlerType<T>;
    case AWSProxy.ALB:
      return createALBRequestHandler(opts as CreateRequestHandlerArgs<ALBEvent>) as InferHandlerType<T>;
    case AWSProxy.FunctionURL:
      return createFunctionURLRequestHandler(
        opts as CreateRequestHandlerArgs<LambdaFunctionURLEvent>,
      ) as InferHandlerType<T>;
    case AWSProxy.FunctionURLStreaming:
      return createFunctionURLStreamingRequestHandler(
        opts as CreateRequestHandlerArgs<LambdaFunctionURLEvent>,
      ) as InferHandlerType<T>;
    default:
      return assertNever(awsProxy, `Unsupported buffered AWS Proxy type: ${awsProxy}`);
  }
}

function assertNever(x: never, message: string): never {
  throw new Error(message);
}
