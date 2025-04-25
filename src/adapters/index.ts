import type { ApiGatewayV1Adapter } from "./api-gateway-v1";
import type { ApiGatewayV2Adapter } from "./api-gateway-v2";
import type { ApplicationLoadBalancerAdapter } from "./application-load-balancer";

import { AWSProxy } from "../server";

import { apiGatewayV1Adapter } from "./api-gateway-v1";
import { apiGatewayV2Adapter } from "./api-gateway-v2";
import { applicationLoadBalancerAdapter } from "./application-load-balancer";

interface ReactRouterAdapter<T, U> {
  createReactRouterRequest: (event: T) => Request;
  sendReactRouterResponse: (nodeResponse: Response) => Promise<U>;
}

const createReactRouterAdapter = (
  awsProxy: AWSProxy,
): ApiGatewayV1Adapter | ApiGatewayV2Adapter | ApplicationLoadBalancerAdapter => {
  switch (awsProxy) {
    case AWSProxy.APIGatewayV1:
      return apiGatewayV1Adapter;
    case AWSProxy.APIGatewayV2:
    case AWSProxy.FunctionURL:
      return apiGatewayV2Adapter;
    case AWSProxy.ALB:
      return applicationLoadBalancerAdapter;
  }
};

export { createReactRouterAdapter };

export type { ReactRouterAdapter };
