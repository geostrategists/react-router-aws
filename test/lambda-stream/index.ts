// based on https://github.com/astuyve/lambda-stream/blob/main/src/index.ts
// which is MIT licensed according to https://www.npmjs.com/package/lambda-stream

import type { StreamifyHandler } from "aws-lambda";
import { ResponseStream } from "./ResponseStream";
import { HttpResponseStream } from "./HttpResponseStream";

export function streamifyResponse<TEvent = any, TResult = void>(
  handler: StreamifyHandler<TEvent, TResult>,
): StreamifyHandler<TEvent, TResult> {
  // Check for global awslambda
  return new Proxy(handler, {
    apply: async (target, _, argList: Parameters<StreamifyHandler<TEvent, TResult>>) => {
      const responseStream: ResponseStream = patchArgs(argList);
      await target(...argList);

      const bodyAndPrelude = responseStream._isBase64Encoded
        ? responseStream.getBufferedData().toString("base64")
        : responseStream.getBufferedData().toString();

      const delim = "\0".repeat(8);
      const delimPos = bodyAndPrelude.indexOf(delim);
      if (delimPos === -1) {
        return {
          statusCode: 200,
          headers: {
            "content-type": responseStream._contentType ?? "application/json",
          },
          cookies: [],
          body: bodyAndPrelude,
        };
      } else {
        const prelude = bodyAndPrelude.slice(0, delimPos);
        const body = bodyAndPrelude.slice(delimPos + delim.length);
        const parsedPrelude = JSON.parse(prelude);
        return {
          ...parsedPrelude,
          body,
        };
      }
    },
  });
}

function patchArgs(argList: any[]): ResponseStream {
  if (!(argList[1] instanceof ResponseStream)) {
    const responseStream = new ResponseStream();
    argList.splice(1, 0, responseStream);
  }
  return argList[1];
}

export const awslambda = {
  HttpResponseStream: HttpResponseStream,
  streamifyResponse: streamifyResponse,
};
