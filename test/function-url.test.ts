import { describe, expect, it } from "vitest";
import { htmlResponse, invokeHandlerWithRRMock, redirectResponse } from "./utils";
import { LambdaFunctionURLEvent } from "aws-lambda";

export function lambdaFunctionUrlEvent(
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

describe("Function URL request handling", () => {
  it("parses Function URL event", async () => {
    await invokeHandlerWithRRMock(
      "createFunctionURLRequestHandler",
      (request) => {
        expect(request.url).toBe("https://example.com/test");
        expect(request.method).toBe("POST");
        expect(request.headers.get("x-custom-header")).toBe("a");
        return new Response("ok");
      },
      lambdaFunctionUrlEvent("/test", "POST", { "x-custom-header": "a" }),
    )
  })
})

describe("Function URL buffered response handling", () => {
  it("html without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLRequestHandler",
      () => htmlResponse(),
      lambdaFunctionUrlEvent("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
      cookies: [],
    });
  });

  it("html with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLRequestHandler",
      () => htmlResponse("a=1; Path=/"),
      lambdaFunctionUrlEvent("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
      cookies: ["a=1; Path=/"],
    });
  });

  it("redirect without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLRequestHandler",
      () => redirectResponse(),
      lambdaFunctionUrlEvent("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      isBase64Encoded: false,
      cookies: [],
    });
  });

  it("redirect with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createFunctionURLRequestHandler",
      () => redirectResponse("b=2; Path=/"),
      lambdaFunctionUrlEvent("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      isBase64Encoded: false,
      cookies: ["b=2; Path=/"],
    });
  });
});
