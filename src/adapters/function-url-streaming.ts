import { ReactRouterAdapter } from "./index";
import type { LambdaFunctionURLEvent } from "aws-lambda";
import { apiGatewayV2Adapter } from "./api-gateway-v2";
import { writeReadableStreamToWritable } from "@react-router/node";
import stream from "node:stream/promises";
import { StreamifyHandler } from "aws-lambda/handler";

const sendReactRouterResponseFunctionUrlStreaming = async (
  response: Response,
  responseStream: awslambda.HttpResponseStream,
) => {
  const httpResponseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  });

  if (response.body) {
    await writeReadableStreamToWritable(response.body, httpResponseStream);
  } else {
    await stream.finished(httpResponseStream);
  }
};

export type FunctionUrlStreamingAdapter = ReactRouterAdapter<
  LambdaFunctionURLEvent,
  void,
  awslambda.HttpResponseStream,
  StreamifyHandler<LambdaFunctionURLEvent, void>
>;

export const functionUrlStreamingAdapter: FunctionUrlStreamingAdapter = {
  wrapHandler: awslambda.streamifyResponse,
  createReactRouterRequest: apiGatewayV2Adapter.createReactRouterRequest,
  sendReactRouterResponse: sendReactRouterResponseFunctionUrlStreaming,
};
