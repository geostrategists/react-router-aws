[![npm version](https://badge.fury.io/js/@geostrategists%2Freact-router-aws.svg)](https://badge.fury.io/js/@geostrategists%2Freact-router-aws)
[![install size](https://packagephobia.com/badge?p=@geostrategists/react-router-aws)](https://packagephobia.com/result?p=@geostrategists/react-router-aws)

# AWS Lambda adapters for React Router v7

This project provides adapters for running React Router Framework applications on AWS Lambda
behind a number of different HTTP gateways.

## 🚀 Supported gateways

- Lambda function URL (streaming) _✨(recommended)_
- Lambda function URL (buffered)
- API Gateway v2
- API Gateway v1
- Application Load Balancer

### Acknowledgements

This project was forked from [remix-aws](https://github.com/wingleung/remix-aws) to support React Router v7, which Remix was merged into.

## Getting started

### Installation

```shell
npm add @geostrategists/react-router-aws
```

```shell
yarn add @geostrategists/react-router-aws
```

### Gateway-specific handlers

Next, choose the handler that matches your AWS integration:

- `createALBRequestHandler` for Application Load Balancer
- `createAPIGatewayV1RequestHandler` for API Gateway v1
- `createAPIGatewayV2RequestHandler` for API Gateway v2
- `createFunctionURLRequestHandler` for Lambda Function URLs (Buffered)
- `createFunctionURLStreamingRequestHandler` for Lambda Function URLs (Streaming)

Example for API Gateway v2:

```javascript
// lambda-handler.ts
import * as build from "virtual:react-router/server-build";
import { createAPIGatewayV2RequestHandler } from "@geostrategists/react-router-aws";

export const handler = createAPIGatewayV2RequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
```

> [!NOTE]
>
> **DEPRECATION NOTICE**: The previous `createRequestHandler` method still exists, but is kept only for
> backwards-compatibility reasons and will be removed in the next major release.  
> It does not allow tree-shaking and will include all gateway adapters in your bundle.  
> For optimal bundle size, always use the method specific to your gateway:

### Request host & CSRF (`getHost`)

React Router derives the host used for its built-in cross-origin (CSRF) check on
action requests from the constructed request URL (`new URL(request.url).host`),
comparing it against the incoming `Origin` header. It is therefore important that
the adapter builds that host from a source you trust.

By default the adapters build the host from the `x-forwarded-host` header
(falling back to the `host`/`Host` header). The resolved value is always
sanitized (invalid characters stripped, port validated) before use.

If the default forwarded host is not the host the browser actually sees, use the
`getHost` option to derive it yourself. The most common case is a **Lambda
Function URL behind CloudFront**: its `event.requestContext.domainName` is always
the internal `*.lambda-url.<region>.on.aws` host (and cannot be overridden), so
you must read the viewer host from a trusted header CloudFront forwards, such as
`cloudfront-viewer-host`:

```javascript
// lambda-handler.ts
import * as build from "virtual:react-router/server-build";
import { createFunctionURLRequestHandler } from "@geostrategists/react-router-aws";

export const handler = createFunctionURLRequestHandler({
  build,
  getHost: (event) => event.headers["cloudfront-viewer-host"],
});
```

`getHost` receives the (correctly typed) gateway event and may return a host
string, or `undefined`/`null` to fall back to the default `x-forwarded-host`
behavior. It is supported by all handlers (API Gateway v1, API Gateway v2, Lambda
Function URL buffered & streaming, and ALB). For example, to prefer the
API Gateway request-context domain name: `getHost: (event) => event.requestContext.domainName`.

> [!NOTE]
> The default currently uses the `x-forwarded-host` header. To align with the
> upstream `@react-router/architect` adapter, the default **will change to the
> API Gateway request-context domain name (`event.requestContext.domainName`) in
> the next major version**. Setups where that host is not the browser-facing host
> (e.g. Function URLs behind CloudFront) should set `getHost` explicitly.

### Streaming support for Lambda Function URLs

React Router and React allow you to stream responses from the server to the client, reducing the TTFB (time to first byte)
and improving the user experience. See [Streaming with Suspense](https://reactrouter.com/how-to/suspense) for details.

For this to work, the response from the Lambda must also be streamed. This is currently only possible with
Lambda Function URLs, which is why we recommend this setup.

For streaming responses from React Router on AWS Lambda Function URLs, use `createFunctionURLStreamingRequestHandler`:

```typescript
// lambda-handler.ts
import * as build from "virtual:react-router/server-build";
import { createFunctionURLStreamingRequestHandler } from "@geostrategists/react-router-aws";

export const handler = createFunctionURLStreamingRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
```

The Function URL must be configured to use streaming responses.

For example, in CDK:

```typescript
// frontend-stack.ts
declare const fn: lambda.Function;

fn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
});
```

> [!TIP]
> It is strongly recommended to include the `@geostrategists/react-router-aws` dependency in your Lambda handler bundle.  
> Otherwise (if it is externalized and perhaps put in a Lambda layer), AWS Lambda may not detect the handler as a
> streaming handler.
>
> If you encounter responses that show a `{ statusCode, headers, body }` JSON object instead of just the body,
> this might be the reason.

More on response streaming: https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html

## Deployment recommendation

Since Vite already bundles the project into a single entry point, there is no need to further
bundle the lambda code.
For example, when using AWS CDK, we recommend using [lambda.Function](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) directly instead of lambda.NodeJsFunction.

Dependencies can be provided using a layer, for example.

We recommend setting the `serverModuleFormat` to ESM.
However, to ensure that AWS lambda correctly interprets the output file as an ES module, you need to take additional steps.

There are two primary methods to achieve this:

- Specify the module type in package.json:
  Add `"type": "module"` to your package.json file and ensure that this file is included in the deployment package sent to AWS Lambda.

- Use the .mjs extension:
  Alternatively, you can change the file extension to `.mjs`. For example, you can configure the React Router `serverBuildFile` setting to output `index.mjs`.

See [AWS docs on ES module support in AWS lambdas](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html#designate-es-module) for more information.
