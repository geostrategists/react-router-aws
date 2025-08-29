import { ReactRouterAdapter } from "./index";
import type { LambdaFunctionURLEvent } from "aws-lambda";
import { createReactRouterRequestAPIGateywayV2, extractAPIGatewayV2ResponseMetadata } from "./api-gateway-v2";
import { writeReadableStreamToWritable } from "@react-router/node";
import { StreamifyHandler } from "aws-lambda/handler";

const emptyStream = () =>
  new ReadableStream({
    start(controller) {
      controller.enqueue("");
      controller.close();
    },
  });

const sendReactRouterResponseFunctionUrlStreaming = async (
  response: Response,
  responseStream: awslambda.HttpResponseStream,
) => {
  const metadata = extractAPIGatewayV2ResponseMetadata(response);

  let body = response.body;
  if (!body) {
    // Function URL needs a write to happen on the stream, otherwise it won't send headers.
    // See https://github.com/fastify/aws-lambda-fastify/issues/154#issuecomment-2614521719
    body = emptyStream();
  }

  const httpResponseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  await writeReadableStreamToWritable(body, httpResponseStream);
};

export type FunctionUrlStreamingAdapter = ReactRouterAdapter<
  LambdaFunctionURLEvent,
  void,
  awslambda.HttpResponseStream,
  StreamifyHandler<LambdaFunctionURLEvent, void>
>;

export const functionUrlStreamingAdapter: FunctionUrlStreamingAdapter = {
  wrapHandler: awslambda.streamifyResponse,
  createReactRouterRequest: createReactRouterRequestAPIGateywayV2,
  sendReactRouterResponse: sendReactRouterResponseFunctionUrlStreaming,
};
