import { describe, expect, it } from "vitest";
import { htmlResponse, invokeHandlerWithRRMock, redirectResponse } from "./utils";
import type { LambdaFunctionURLEvent } from "aws-lambda";

function lambdaFunctionUrlEvent(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
  cookies?: string[],
): LambdaFunctionURLEvent {
  return {
    requestContext: { http: { method } } as LambdaFunctionURLEvent["requestContext"],
    rawPath: path,
    rawQueryString: "",
    headers: {
      host: "example.com",
      "x-forwarded-proto": "https",
      ...headers,
    },
    cookies,
    body: undefined,
    isBase64Encoded: false,
  } as Partial<LambdaFunctionURLEvent> as LambdaFunctionURLEvent;
}

describe("Function URL streaming request handling", () => {
  it("parses Function URL event", async () => {
    await invokeHandlerWithRRMock(
      "createFunctionURLStreamingRequestHandler",
      (request) => {
        expect(request.url).toBe("https://example.com/test");
        expect(request.method).toBe("POST");
        expect(request.headers.get("x-custom-header")).toBe("a");
        return new Response("ok");
      },
      lambdaFunctionUrlEvent("/test", "POST", { "x-custom-header": "a" }),
    );
  });
});

describe("Function URL streaming response handling", () => {
  it("html without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLStreamingRequestHandler",
      () => htmlResponse(),
      lambdaFunctionUrlEvent("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      cookies: [],
    });
  });

  it("html with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLStreamingRequestHandler",
      () => htmlResponse("a=1; Path=/"),
      lambdaFunctionUrlEvent("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      cookies: ["a=1; Path=/"],
    });
  });

  it("redirect without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLStreamingRequestHandler",
      () => redirectResponse(),
      lambdaFunctionUrlEvent("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      cookies: [],
      // empty body gets added to provoke a write on the stream
      body: "",
    });
  });

  it("redirect with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLStreamingRequestHandler",
      () => redirectResponse("b=2; Path=/"),
      lambdaFunctionUrlEvent("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      cookies: ["b=2; Path=/"],
      // empty body gets added to provoke a write on the stream
      body: "",
    });
  });
});
