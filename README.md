# @geostrategists/react-router-aws

## AWS adapters for React Router v7 (successor to Remix)

[![npm version](https://badge.fury.io/js/@geostrategists%2Freact-router-aws.svg)](https://badge.fury.io/js/@geostrategists%2Freact-router-aws)
[![install size](https://packagephobia.com/badge?p=@geostrategists/react-router-aws)](https://packagephobia.com/result?p=@geostrategists/react-router-aws)

Forked from [remix-aws](https://github.com/wingleung/remix-aws) to support React Router v7, which Remix was merged into.

## 🚀 support

- API gateway v1
- API gateway v2
- Application load balancer

## Getting started

```shell
npm install --save @geostrategists/react-router-aws
```

```javascript
// server.js
import * as build from "virtual:react-router/server-build";
import { AWSProxy, createRequestHandler } from "@geostrategists/react-router-aws";

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  awsProxy: AWSProxy.APIGatewayV2,
});
```

### `awsProxy`

By default, the `awsProxy` is set to `AWSProxy.APIGatewayV2`.

#### Options

- `AWSProxy.APIGatewayV1`
- `AWSProxy.APIGatewayV2`
- `AWSProxy.ALB`
- `AWSProxy.FunctionURL`

## Deployment recommendation

Since Vite already bundles the project into a single entry point, there is no need to further
bundle the lambda code.
For example, when using AWS CDK, we recommend using lambda.Function directly instead of lambda.NodeJsFunction.

Dependencies can be provided using a layer, for example.

We recommend setting the `serverModuleFormat` to ESM.
However, to ensure that AWS lambda correctly interprets the output file as an ES module, you need to take additional steps.

There are two primary methods to achieve this:

- Specify the module type in package.json:
  Add `"type": "module"` to your package.json file and ensure that this file is included in the deployment package sent to AWS Lambda.

- Use the .mjs extension:
  Alternatively, you can change the file extension to `.mjs`. For example, you can configure the React Router `serverBuildFile` setting to output `index.mjs`.

more info: [AWS docs on ES module support in AWS lambdas](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html#designate-es-module)

## Notes

### split from @remix/architect

As mentioned in [#3173](https://github.com/remix-run/remix/pull/3173) the goal would be to provide an AWS adapter for
the community by the community.
In doing so the focus will be on AWS integrations and less on Architect. I do think it's added value to provide examples
for Architect, AWS SAM, AWS CDK, Serverless,...

**info:** [ALB types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/trigger/alb.d.ts#L29-L48)
vs [API gateway v1 types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/trigger/api-gateway-proxy.d.ts#L116-L145)
